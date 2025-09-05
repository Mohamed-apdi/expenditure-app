import { useState, useEffect } from "react";
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
import {
  Wallet,
  X,
  Edit3,
  Plus,
  ChevronDown,
  Trash2,
} from "lucide-react-native";
import Toast from "react-native-toast-message";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import { supabase } from "~/lib";
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "~/lib";
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
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountAmount, setNewAccountAmount] = useState("");
  const [newAccountType, setNewAccountType] = useState("");
  const [newAccountDescription, setNewAccountDescription] = useState("");
  const [showAccountTypeDropdown, setShowAccountTypeDropdown] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [settingAmount, setSettingAmount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [newlyAddedAccountId, setNewlyAddedAccountId] = useState<string | null>(
    null
  );
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);

  // Predefined account types
  const accountTypes = [
    { id: "1", name: "Cash" },
    { id: "2", name: "Accounts" },
    { id: "3", name: "SIM Card" },
    { id: "4", name: "Debit Card" },
    { id: "5", name: "Savings" },
    { id: "6", name: "Top-Up/Prepaid" },
    { id: "7", name: "Investments" },
    { id: "8", name: "Overdrafts" },
    { id: "9", name: "Loan" },
    { id: "10", name: "Insurance" },
    { id: "11", name: "Card" },
    { id: "12", name: "Others" },
  ];

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
      const mainAccount = userAccounts.length > 0 ? userAccounts[0] : null;
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

  const handleEditAccount = async () => {
    if (!accountToEdit || !newAccountName.trim()) return;

    // Validate name
    if (/^\d+$/.test(newAccountName.trim())) {
      Toast.show({
        type: "error",
        text1: t.nameCannotBeNumbers || "Name cannot be only numbers",
      });
      return;
    }

    // Validate amount
    const amount = parseFloat(newAccountAmount || "0");
    if (isNaN(amount) || amount < 0) {
      Toast.show({
        type: "error",
        text1: t.invalidAmount || "Please enter a valid amount",
      });
      return;
    }

    try {
      setRenaming(true);

      const updatedAccount = await updateAccount(accountToEdit.id, {
        name: newAccountName.trim(),
        amount: amount,
        account_type: newAccountType || accountToEdit.account_type,
        description: newAccountDescription || accountToEdit.description,
      });

      setAccounts((prev) =>
        prev.map((acc) => (acc.id === accountToEdit.id ? updatedAccount : acc))
      );

      // Update default account if it was the one being edited
      if (defaultAccount?.id === accountToEdit.id) {
        setDefaultAccount(updatedAccount);
      }

      setShowRenameModal(false);
      setNewAccountName("");
      setNewAccountAmount("");
      setNewAccountType("");
      setNewAccountDescription("");
      setAccountToEdit(null);

      Toast.show({
        type: "success",
        text1: t.accountUpdated || "Account updated",
        text2: `${updatedAccount.name} has been updated successfully`,
      });
    } catch (error) {
      console.error("Error updating account:", error);
      Toast.show({
        type: "error",
        text1: t.somethingWentWrong || "Something went wrong",
      });
    } finally {
      setRenaming(false);
    }
  };

  const handleSetAmount = async () => {
    if (!defaultAccount || !newAccountAmount.trim()) return;

    // Validate amount
    const amount = Number.parseFloat(newAccountAmount.trim());
    if (isNaN(amount) || amount < 0) {
      Toast.show({
        type: "error",
        text1: t.invalidAmount || "Please enter a valid amount",
      });
      return;
    }

    try {
      setSettingAmount(true);

      const updatedAccount = await updateAccount(defaultAccount.id, {
        amount: amount,
      });

      setAccounts((prev) =>
        prev.map((acc) => (acc.id === defaultAccount.id ? updatedAccount : acc))
      );
      setDefaultAccount(updatedAccount);
      setShowAmountModal(false);
      setNewAccountAmount("");

      Toast.show({
        type: "success",
        text1: t.amountUpdated || "Amount updated successfully",
      });
    } catch (error) {
      console.error("Error setting amount:", error);
      Toast.show({
        type: "error",
        text1: t.somethingWentWrong || "Something went wrong",
      });
    } finally {
      setSettingAmount(false);
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

      // Add new account to the top of the list
      setAccounts((prev) => [newAccount, ...prev]);

      // Set the newly added account ID for visual feedback
      setNewlyAddedAccountId(newAccount.id);

      // Clear the highlight after 3 seconds
      setTimeout(() => {
        setNewlyAddedAccountId(null);
      }, 3000);

      setShowAddAccountModal(false);

      Toast.show({
        type: "success",
        text1: t.accountCreated || "Account created",
        text2: `${newAccount.name} has been added successfully`,
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

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;

    try {
      setDeletingAccount(true);

      await deleteAccount(accountToDelete.id);

      // Remove account from the list
      setAccounts((prev) =>
        prev.filter((acc) => acc.id !== accountToDelete.id)
      );

      // Update default account if it was deleted
      if (defaultAccount?.id === accountToDelete.id) {
        const remainingAccounts = accounts.filter(
          (acc) => acc.id !== accountToDelete.id
        );
        setDefaultAccount(
          remainingAccounts.length > 0 ? remainingAccounts[0] : null
        );
      }

      setShowDeleteModal(false);
      setAccountToDelete(null);

      Toast.show({
        type: "success",
        text1: t.accountDeleted || "Account deleted",
        text2: `${accountToDelete.name} has been removed`,
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      Toast.show({
        type: "error",
        text1: t.somethingWentWrong || "Something went wrong",
      });
    } finally {
      setDeletingAccount(false);
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
            <Text
              style={{
                color: theme.textSecondary,
                marginTop: 16,
                fontSize: 16,
              }}
            >
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
          contentContainerStyle={{ flexGrow: 1, padding: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{ alignItems: "center", marginBottom: 40, marginTop: 20 }}
          >
            <View
              style={{
                backgroundColor: `${theme.primary}15`,
                padding: 24,
                borderRadius: 50,
                marginBottom: 24,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Wallet size={48} color={theme.primary} />
            </View>

            <Text
              style={{
                color: theme.text,
                fontSize: 32,
                fontWeight: "800",
                textAlign: "center",
                marginBottom: 12,
                letterSpacing: -0.5,
              }}
            >
              {t.setupYourAccounts || "Setup Your Accounts"}
            </Text>
            <Text
              style={{
                color: theme.textSecondary,
                textAlign: "center",
                fontSize: 17,
                lineHeight: 26,
                paddingHorizontal: 10,
                fontWeight: "400",
              }}
            >
              {t.customizeYourAccounts ||
                "We've created your main account. You can customize it or add more accounts"}
            </Text>
          </View>

          {/* Main Content */}
          <View style={{ flex: 1 }}>
            {accounts.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    paddingVertical: 18,
                    paddingHorizontal: 32,
                    borderRadius: 16,
                    alignItems: "center",
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 8,
                    minWidth: 200,
                  }}
                  onPress={handleCreateMainAccount}
                  disabled={creatingMainAccount}
                  accessibilityLabel={
                    t.createMainAccount || "Create Main Account"
                  }
                  testID="create-main-account-button"
                >
                  {creatingMainAccount ? (
                    <ActivityIndicator color={theme.primaryText} size="small" />
                  ) : (
                    <Text
                      style={{
                        color: theme.primaryText,
                        fontSize: 18,
                        fontWeight: "700",
                      }}
                    >
                      {t.createMainAccount || "Create Main Account"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Accounts List */}
                <View style={{ marginBottom: 24 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 20,
                      fontWeight: "700",
                      marginBottom: 16,
                      textAlign: "center",
                    }}
                  >
                    {t.yourAccounts || "Your Accounts"}
                  </Text>

                  {accounts.map((account) => (
                    <View
                      key={account.id}
                      style={{
                        backgroundColor: theme.cardBackground,
                        borderWidth: 1,
                        borderColor:
                          newlyAddedAccountId === account.id
                            ? theme.primary
                            : theme.border,
                        borderRadius: 16,
                        padding: 20,
                        marginBottom: 16,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity:
                          newlyAddedAccountId === account.id ? 0.1 : 0.05,
                        shadowRadius: 8,
                        elevation: newlyAddedAccountId === account.id ? 5 : 3,
                        transform: [
                          {
                            scale:
                              newlyAddedAccountId === account.id ? 1.02 : 1,
                          },
                        ],
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: theme.text,
                              fontSize: 18,
                              fontWeight: "700",
                              marginRight: 8,
                            }}
                          >
                            {account.name}
                          </Text>
                          {newlyAddedAccountId === account.id && (
                            <View
                              style={{
                                backgroundColor: theme.primary,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 12,
                              }}
                            >
                              <Text
                                style={{
                                  color: theme.primaryText,
                                  fontSize: 10,
                                  fontWeight: "bold",
                                }}
                              >
                                NEW
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={{
                            color: theme.textSecondary,
                            fontSize: 14,
                            marginBottom: 8,
                          }}
                        >
                          {account.account_type}
                        </Text>
                        <Text
                          style={{
                            color: theme.primary,
                            fontSize: 24,
                            fontWeight: "800",
                            letterSpacing: -0.5,
                          }}
                        >
                          ${account.amount?.toFixed(2) || "0.00"}
                        </Text>
                      </View>

                      {/* Action Buttons */}
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        {/* Edit Button */}
                        <TouchableOpacity
                          style={{
                            backgroundColor: theme.cardBackground,
                            borderWidth: 1,
                            borderColor: theme.border,
                            padding: 12,
                            borderRadius: 12,
                          }}
                          onPress={() => {
                            setAccountToEdit(account);
                            setNewAccountName(account.name);
                            setNewAccountAmount(
                              account.amount?.toString() || "0"
                            );
                            setNewAccountType(account.account_type);
                            setNewAccountDescription(account.description || "");
                            setShowRenameModal(true);
                          }}
                        >
                          <Edit3 size={18} color={theme.textMuted} />
                        </TouchableOpacity>

                        {/* Delete Button */}
                        <TouchableOpacity
                          style={{
                            backgroundColor: "#ef4444",
                            padding: 12,
                            borderRadius: 12,
                          }}
                          onPress={() => {
                            setAccountToDelete(account);
                            setShowDeleteModal(true);
                          }}
                        >
                          <Trash2 size={18} color="white" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    paddingVertical: 18,
                    paddingHorizontal: 24,
                    borderRadius: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 8,
                    marginBottom: 16,
                  }}
                  onPress={() => setShowAddAccountModal(true)}
                  accessibilityLabel={
                    t.addAnotherAccount || "Add Another Account"
                  }
                  testID="add-another-account-button"
                >
                  <Plus
                    size={20}
                    color={theme.primaryText}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{
                      color: theme.primaryText,
                      fontSize: 17,
                      fontWeight: "700",
                    }}
                  >
                    {t.addAnotherAccount || "Add Another Account"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          {/* Skip for now button */}
          <View style={{ paddingTop: 20, paddingBottom: 10 }}>
            <TouchableOpacity
              style={{
                alignItems: "center",
                paddingVertical: 16,
                paddingHorizontal: 24,
              }}
              onPress={handleSkip}
              accessibilityLabel={t.continueToProfile || "Continue to Profile"}
              testID="continue-button"
            >
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 16,
                  fontWeight: "600",
                }}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.8}
              >
                {t.skipForNow || "Skip"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Edit Account Modal */}
        <Modal
          visible={showRenameModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowRenameModal(false);
            setShowAccountTypeDropdown(false);
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
          >
            <View
              style={{
                backgroundColor: theme.cardBackground,
                borderRadius: 20,
                padding: 28,
                width: "100%",
                maxWidth: 400,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 22,
                    fontWeight: "700",
                  }}
                >
                  {t.editAccount || "Edit Account"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowRenameModal(false);
                    setShowAccountTypeDropdown(false);
                  }}
                  style={{
                    padding: 4,
                    borderRadius: 8,
                  }}
                >
                  <X size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Account Name */}
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 16,
                      fontWeight: "600",
                      marginBottom: 12,
                    }}
                  >
                    {t.accountName || "Account Name"}
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: theme.inputBackground,
                      borderWidth: 1,
                      borderColor: theme.inputBorder,
                      borderRadius: 12,
                      padding: 16,
                      color: theme.text,
                      fontSize: 16,
                      fontWeight: "500",
                    }}
                    placeholder={t.enterAccountName || "Enter account name"}
                    placeholderTextColor={theme.placeholder}
                    value={newAccountName}
                    onChangeText={setNewAccountName}
                    autoFocus={true}
                    accessibilityLabel={t.accountName || "Account Name"}
                    testID="account-name-input"
                  />
                </View>

                {/* Account Amount */}
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 16,
                      fontWeight: "600",
                      marginBottom: 12,
                    }}
                  >
                    {t.amount || "Amount"}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: theme.inputBackground,
                      borderWidth: 1,
                      borderColor: theme.inputBorder,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 18,
                        fontWeight: "bold",
                        marginRight: 8,
                      }}
                    >
                      $
                    </Text>
                    <TextInput
                      style={{
                        flex: 1,
                        paddingVertical: 16,
                        color: theme.text,
                        fontSize: 16,
                        fontWeight: "500",
                      }}
                      placeholder="0.00"
                      placeholderTextColor={theme.placeholder}
                      keyboardType="numeric"
                      value={
                        newAccountAmount !== undefined &&
                        !isNaN(Number(newAccountAmount))
                          ? newAccountAmount.toString()
                          : ""
                      }
                      onChangeText={(text) => {
                        const cleanedText = text.replace(/[^0-9.]/g, "");
                        const decimalParts = cleanedText.split(".");
                        let formattedValue = decimalParts[0];

                        if (decimalParts.length > 1) {
                          formattedValue +=
                            "." +
                            decimalParts.slice(1).join("").substring(0, 2);
                        }

                        setNewAccountAmount(formattedValue);
                      }}
                      accessibilityLabel={t.amount || "Amount"}
                      testID="amount-input"
                    />
                  </View>
                </View>

                {/* Account Type */}
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 16,
                      fontWeight: "600",
                      marginBottom: 12,
                    }}
                  >
                    {t.accountType || "Account Type"}
                  </Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: theme.inputBackground,
                      borderWidth: 1,
                      borderColor: theme.inputBorder,
                      borderRadius: 12,
                      padding: 16,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                    onPress={() =>
                      setShowAccountTypeDropdown(!showAccountTypeDropdown)
                    }
                  >
                    <Text
                      style={{
                        color: newAccountType ? theme.text : theme.placeholder,
                        fontSize: 16,
                        fontWeight: "500",
                      }}
                    >
                      {newAccountType ||
                        t.selectAccountType ||
                        "Select Account Type"}
                    </Text>
                    <ChevronDown size={18} color={theme.textMuted} />
                  </TouchableOpacity>

                  {/* Account Type Dropdown */}
                  {showAccountTypeDropdown && (
                    <View
                      style={{
                        marginTop: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 12,
                        backgroundColor: theme.cardBackground,
                        maxHeight: 200,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                      }}
                    >
                      <ScrollView showsVerticalScrollIndicator={false}>
                        {accountTypes.map((type) => (
                          <TouchableOpacity
                            key={type.id}
                            style={{
                              padding: 16,
                              borderBottomWidth: 1,
                              borderBottomColor: theme.border,
                              backgroundColor:
                                newAccountType === type.name
                                  ? `${theme.primary}20`
                                  : "transparent",
                            }}
                            onPress={() => {
                              setNewAccountType(type.name);
                              setShowAccountTypeDropdown(false);
                            }}
                          >
                            <Text
                              style={{
                                color: theme.text,
                                fontSize: 16,
                                fontWeight: "500",
                              }}
                            >
                              {type.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Description (Optional) */}
                <View style={{ marginBottom: 24 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 16,
                      fontWeight: "600",
                      marginBottom: 12,
                    }}
                  >
                    {t.description || "Description"}{" "}
                    {t.optional && `(${t.optional})`}
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: theme.inputBackground,
                      borderWidth: 1,
                      borderColor: theme.inputBorder,
                      borderRadius: 12,
                      padding: 16,
                      color: theme.text,
                      fontSize: 16,
                      fontWeight: "500",
                      minHeight: 80,
                      textAlignVertical: "top",
                    }}
                    placeholder={
                      t.enterDescription || "Enter description (optional)"
                    }
                    placeholderTextColor={theme.placeholder}
                    value={newAccountDescription}
                    onChangeText={setNewAccountDescription}
                    multiline={true}
                    numberOfLines={3}
                    accessibilityLabel={t.description || "Description"}
                    testID="description-input"
                  />
                </View>
              </ScrollView>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.cardBackground,
                    borderWidth: 1,
                    borderColor: theme.border,
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                  onPress={() => {
                    setShowRenameModal(false);
                    setShowAccountTypeDropdown(false);
                  }}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    {t.cancel || "Cancel"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.primary,
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: "center",
                    opacity: !newAccountName.trim() || renaming ? 0.6 : 1,
                  }}
                  onPress={handleEditAccount}
                  disabled={renaming || !newAccountName.trim()}
                >
                  {renaming ? (
                    <ActivityIndicator color={theme.primaryText} size="small" />
                  ) : (
                    <Text
                      style={{
                        color: theme.primaryText,
                        fontSize: 16,
                        fontWeight: "700",
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

        <Modal
          visible={showAmountModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAmountModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
          >
            <View
              style={{
                backgroundColor: theme.cardBackground,
                borderRadius: 20,
                padding: 28,
                width: "100%",
                maxWidth: 400,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 22,
                    fontWeight: "700",
                  }}
                >
                  {t.setAccountAmount || "Set Balance"}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAmountModal(false)}
                  style={{
                    padding: 4,
                    borderRadius: 8,
                  }}
                >
                  <X size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: "600",
                    marginBottom: 12,
                  }}
                >
                  {t.initialBalance || "Current Balance"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: theme.inputBackground,
                    borderWidth: 1,
                    borderColor: theme.inputBorder,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                  }}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 20,
                      fontWeight: "700",
                      marginRight: 8,
                    }}
                  >
                    $
                  </Text>
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 16,
                      color: theme.text,
                      fontSize: 18,
                      fontWeight: "600",
                    }}
                    placeholder={t.enterAmount || "0.00"}
                    placeholderTextColor={theme.placeholder}
                    value={newAccountAmount}
                    onChangeText={setNewAccountAmount}
                    keyboardType="numeric"
                    autoFocus={true}
                    accessibilityLabel={t.initialBalance || "Initial Balance"}
                    testID="amount-input"
                  />
                </View>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 13,
                    marginTop: 8,
                    fontWeight: "500",
                  }}
                >
                  {t.amountDescription || "Enter your current account balance"}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.cardBackground,
                    borderWidth: 1,
                    borderColor: theme.border,
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                  onPress={() => setShowAmountModal(false)}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    {t.cancel || "Cancel"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.primary,
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: "center",
                    opacity:
                      !newAccountAmount.trim() || settingAmount ? 0.6 : 1,
                  }}
                  onPress={handleSetAmount}
                  disabled={settingAmount || !newAccountAmount.trim()}
                >
                  {settingAmount ? (
                    <ActivityIndicator color={theme.primaryText} size="small" />
                  ) : (
                    <Text
                      style={{
                        color: theme.primaryText,
                        fontSize: 16,
                        fontWeight: "700",
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

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
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
                  {t.deleteAccount || "Delete Account"}
                </Text>
                <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
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
                  {t.deleteAccountConfirmation ||
                    "Are you sure you want to delete this account?"}
                </Text>
                <View
                  style={{
                    backgroundColor: theme.inputBackground,
                    borderWidth: 1,
                    borderColor: theme.inputBorder,
                    borderRadius: 8,
                    padding: 16,
                    marginTop: 12,
                  }}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 16,
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    {accountToDelete?.name}
                  </Text>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 14,
                      marginBottom: 4,
                    }}
                  >
                    {accountToDelete?.account_type}
                  </Text>
                  <Text
                    style={{
                      color: theme.primary,
                      fontSize: 18,
                      fontWeight: "bold",
                    }}
                  >
                    ${accountToDelete?.amount?.toFixed(2) || "0.00"}
                  </Text>
                </View>
                <Text
                  style={{
                    color: "#ef4444",
                    fontSize: 12,
                    marginTop: 8,
                  }}
                >
                  {t.deleteAccountWarning || "This action cannot be undone."}
                </Text>
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
                  onPress={() => setShowDeleteModal(false)}
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
                    backgroundColor: "#ef4444",
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                  onPress={handleDeleteAccount}
                  disabled={deletingAccount}
                >
                  {deletingAccount ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text
                      style={{
                        color: "white",
                        fontSize: 16,
                        fontWeight: "500",
                      }}
                    >
                      {t.delete || "Delete"}
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
