import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Wallet, X, Check } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import { supabase } from "~/lib";
import { fetchAccounts, createAccount, updateAccount } from "~/lib";
import AddAccount from "~/app/account-details/add-account";
import type { Account, AccountGroup } from "~/lib/types/types";
import { StatusBar } from "expo-status-bar";

export default function PostSignupSetupScreen() {
  const theme = useTheme();
  const { t } = useLanguage();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [defaultAccount, setDefaultAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingMainAccount, setCreatingMainAccount] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Fetch user's accounts
      const userAccounts = await fetchAccounts(user.id);
      setAccounts(userAccounts);

      // Find earliest account
      let mainAccount = userAccounts.length > 0 ? userAccounts[0] : null;
      setDefaultAccount(mainAccount || null);

      // Load account groups for AddAccount modal
      try {
        const { data: groups } = await supabase
          .from("account_groups")
          .select("*")
          .eq("user_id", user.id);
        setAccountGroups(groups || []);
      } catch (error) {
        console.error("Error loading account groups:", error);
        setAccountGroups([]);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      Toast.show({
        type: "error",
        text1: t.somethingWentWrong || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMainAccount = async () => {
    try {
      setCreatingMainAccount(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const newAccount = await createAccount({
        user_id: user.id,
        account_type: "Accounts",
        name: "Main Account",
        amount: 0,
        description: "Main account",
      });

      setAccounts((prev) => [newAccount, ...prev]);
      setDefaultAccount(newAccount);

      Toast.show({
        type: "success",
        text1: t.accountCreated || "Account created",
      });
    } catch (error) {
      console.error("Error creating main account:", error);
      Toast.show({
        type: "error",
        text1: t.somethingWentWrong || "Something went wrong",
      });
    } finally {
      setCreatingMainAccount(false);
    }
  };

  const handleRenameAccount = async () => {
    if (!defaultAccount || !newAccountName.trim()) return;

    // Validate name
    if (/^\d+$/.test(newAccountName.trim())) {
      Toast.show({
        type: "error",
        text1: t.nameCannotBeNumbers || "Name cannot be only numbers",
      });
      return;
    }

    try {
      setRenaming(true);

      const updatedAccount = await updateAccount(defaultAccount.id, {
        name: newAccountName.trim(),
      });

      setAccounts((prev) =>
        prev.map((acc) => (acc.id === defaultAccount.id ? updatedAccount : acc))
      );
      setDefaultAccount(updatedAccount);
      setShowRenameModal(false);
      setNewAccountName("");

      Toast.show({
        type: "success",
        text1: t.accountRenamed || "Account renamed",
      });
    } catch (error) {
      console.error("Error renaming account:", error);
      Toast.show({
        type: "error",
        text1: t.somethingWentWrong || "Something went wrong",
      });
    } finally {
      setRenaming(false);
    }
  };

  const handleAddAccount = async (accountData: {
    account_type: string;
    name: string;
    amount: number;
    description?: string;
  }) => {
    try {
      setAddingAccount(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const newAccount = await createAccount({
        user_id: user.id,
        ...accountData,
      });

      setAccounts((prev) => [newAccount, ...prev]);
      setShowAddAccountModal(false);

      Toast.show({
        type: "success",
        text1: t.accountCreated || "Account created",
      });
    } catch (error) {
      console.error("Error adding account:", error);
      Toast.show({
        type: "error",
        text1: t.somethingWentWrong || "Something went wrong",
      });
    } finally {
      setAddingAccount(false);
    }
  };

  const handleSkip = () => {
    router.replace("/(onboarding)/profile-setup");
  };

  if (loading) {
    return (
      <>
        <StatusBar style="auto" />
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
              {t.loading || "Loading..."}
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
        >
          {/* Header Icon */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <View
              style={{
                backgroundColor: `${theme.primary}20`,
                padding: 20,
                borderRadius: 40,
                marginBottom: 16,
              }}
            >
              <Wallet size={40} color={theme.primary} />
            </View>
          </View>

          {/* Title */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <Text
              style={{
                color: theme.text,
                fontSize: 28,
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {t.setupYourAccounts || "Setup Your Accounts"}
            </Text>
            <Text
              style={{
                color: theme.textSecondary,
                textAlign: "center",
                fontSize: 16,
                lineHeight: 24,
              }}
            >
              {t.youCanRenameOrAddAccount ||
                "You can rename your main account or add another account"}
            </Text>
          </View>

          {/* Main Actions */}
          <View style={{ flex: 1, justifyContent: "center" }}>
            {accounts.length === 0 ? (
              // No accounts - show create main account button
              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary,
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  borderRadius: 12,
                  alignItems: "center",
                  marginBottom: 16,
                }}
                onPress={handleCreateMainAccount}
                disabled={creatingMainAccount}
                accessibilityLabel={
                  t.createMainAccount || "Create Main Account"
                }
                testID="create-main-account-button"
              >
                {creatingMainAccount ? (
                  <ActivityIndicator color={theme.primaryText} />
                ) : (
                  <Text
                    style={{
                      color: theme.primaryText,
                      fontSize: 18,
                      fontWeight: "bold",
                    }}
                  >
                    {t.createMainAccount || "Create Main Account"}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              // Has accounts - show rename and add options
              <>
                {/* Rename Main Account Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.cardBackground,
                    borderWidth: 1,
                    borderColor: theme.border,
                    paddingVertical: 16,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                  onPress={() => {
                    setNewAccountName(defaultAccount?.name || "");
                    setShowRenameModal(true);
                  }}
                  accessibilityLabel={
                    t.renameMainAccount || "Rename Main Account"
                  }
                  testID="rename-main-account-button"
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 18,
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    {t.renameMainAccount || "Rename Main Account"}
                  </Text>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    Change the name of your main account
                  </Text>
                </TouchableOpacity>

                {/* Add Another Account Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    paddingVertical: 16,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                  onPress={() => setShowAddAccountModal(true)}
                  accessibilityLabel={
                    t.addAnotherAccount || "Add Another Account"
                  }
                  testID="add-another-account-button"
                >
                  <Text
                    style={{
                      color: theme.primaryText,
                      fontSize: 18,
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    {t.addAnotherAccount || "Add Another Account"}
                  </Text>
                  <Text
                    style={{
                      color: theme.primaryText,
                      fontSize: 14,
                      textAlign: "center",
                      opacity: 0.9,
                    }}
                  >
                    Create another account
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Skip Button */}
          <TouchableOpacity
            style={{
              alignItems: "center",
              paddingVertical: 16,
            }}
            onPress={handleSkip}
            accessibilityLabel={t.skipForNow || "Skip for now"}
            testID="skip-button"
          >
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 16,
                fontWeight: "500",
              }}
            >
              {t.skipForNow || "Skip for now"}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Rename Modal */}
        <Modal
          visible={showRenameModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRenameModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              justifyContent: "center",
              alignItems: "center",
              padding: 24,
            }}
          >
            <View
              style={{
                backgroundColor: theme.cardBackground,
                borderRadius: 16,
                padding: 24,
                width: "100%",
                maxWidth: 400,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 20,
                    fontWeight: "bold",
                  }}
                >
                  {t.renameAccount || "Rename Account"}
                </Text>
                <TouchableOpacity onPress={() => setShowRenameModal(false)}>
                  <X size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 16,
                    marginBottom: 8,
                  }}
                >
                  {t.newName || "New Name"}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: theme.inputBackground,
                    borderWidth: 1,
                    borderColor: theme.inputBorder,
                    borderRadius: 8,
                    padding: 12,
                    color: theme.text,
                    fontSize: 16,
                  }}
                  placeholder={t.enterNewName || "Enter new name"}
                  placeholderTextColor={theme.placeholder}
                  value={newAccountName}
                  onChangeText={setNewAccountName}
                  autoFocus={true}
                  accessibilityLabel={t.newName || "New Name"}
                  testID="rename-input"
                />
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.cardBackground,
                    borderWidth: 1,
                    borderColor: theme.border,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                  onPress={() => setShowRenameModal(false)}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 16,
                      fontWeight: "500",
                    }}
                  >
                    {t.cancel || "Cancel"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.primary,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                  onPress={handleRenameAccount}
                  disabled={renaming || !newAccountName.trim()}
                >
                  {renaming ? (
                    <ActivityIndicator color={theme.primaryText} />
                  ) : (
                    <Text
                      style={{
                        color: theme.primaryText,
                        fontSize: 16,
                        fontWeight: "500",
                      }}
                    >
                      {t.save || "Save"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Account Modal */}
        <AddAccount
          visible={showAddAccountModal}
          onClose={() => setShowAddAccountModal(false)}
          onAddAccount={handleAddAccount}
          accountGroups={accountGroups}
        />
      </SafeAreaView>
    </>
  );
}
