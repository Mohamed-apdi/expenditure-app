import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import {
  ArrowRight,
  ArrowUpDown,
  ChevronDown,
  Wallet,
} from "lucide-react-native";
import type { Account } from "~/lib";

type Props = {
  transferAmount: string;
  setTransferAmount: (value: string) => void;
  fromAccount: Account | null;
  setFromAccount: (account: Account | null) => void;
  toAccount: Account | null;
  setToAccount: (account: Account | null) => void;
  accounts: Account[];
  isSubmitting: boolean;
  handleTransfer: () => void;
  theme: any;
  t: any;
};

const CARD_STYLE = {
  paddingVertical: 16,
  paddingHorizontal: 16,
  borderRadius: 16,
  minHeight: 72,
  borderWidth: 1,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

export default function TransferForm({
  transferAmount,
  setTransferAmount,
  fromAccount,
  setFromAccount,
  toAccount,
  setToAccount,
  accounts,
  isSubmitting,
  handleTransfer,
  theme,
  t,
}: Props) {
  const [accountSheetMode, setAccountSheetMode] = useState<"from" | "to" | null>(
    null
  );

  const openFromSheet = useCallback(() => setAccountSheetMode("from"), []);
  const openToSheet = useCallback(() => setAccountSheetMode("to"), []);

  const closeSheet = useCallback(() => setAccountSheetMode(null), []);

  const filteredAccounts = useMemo(() => {
    if (accountSheetMode === "from") {
      return accounts.filter((acc) => acc.id !== toAccount?.id);
    }
    if (accountSheetMode === "to") {
      return accounts.filter((acc) => acc.id !== fromAccount?.id);
    }
    return accounts;
  }, [accounts, accountSheetMode, fromAccount?.id, toAccount?.id]);

  const handleSelectAccount = useCallback(
    (account: Account) => {
      if (accountSheetMode === "from") {
        setFromAccount(account);
      } else if (accountSheetMode === "to") {
        setToAccount(account);
      }
      setAccountSheetMode(null);
    },
    [accountSheetMode, setFromAccount, setToAccount]
  );

  const sheetTitle =
    accountSheetMode === "from"
      ? t.from || "From account"
      : accountSheetMode === "to"
        ? t.to || "To account"
        : "";

  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Amount Input */}
      <View style={{ alignItems: "center", marginBottom: 32 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{
              color: theme.primary,
              fontSize: 28,
              fontWeight: "600",
              marginRight: 8,
            }}
          >
            $
          </Text>
          <TextInput
            style={{
              color: theme.text,
              fontSize: 28,
              fontWeight: "600",
              minWidth: 100,
              textAlign: "center",
            }}
            value={transferAmount}
            onChangeText={setTransferAmount}
            placeholder="0.00"
            placeholderTextColor={theme.placeholder}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>
      </View>

      {/* From Account - Card */}
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "500",
            marginBottom: 8,
            color: theme.textSecondary,
          }}
        >
          {t.from || "From"}
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openFromSheet}
          style={{
            ...CARD_STYLE,
            backgroundColor: theme.cardBackground,
            borderColor: fromAccount ? theme.primary : theme.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: fromAccount
                  ? `${theme.primary}18`
                  : `${theme.border}40`,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Wallet
                size={22}
                color={fromAccount ? theme.primary : theme.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: fromAccount ? theme.text : theme.placeholder,
                }}
                numberOfLines={1}
              >
                {fromAccount?.name ?? (t.select_account || "Select account")}
              </Text>
              {fromAccount && (
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {t.balance || "Balance"}: ${fromAccount.amount.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
          <ChevronDown size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Transfer Arrow */}
      {fromAccount && toAccount && (
        <View style={{ alignItems: "center", marginVertical: 8 }}>
          <View
            style={{
              backgroundColor: theme.primary,
              borderRadius: 20,
              padding: 10,
            }}
          >
            <ArrowRight size={18} color="white" />
          </View>
        </View>
      )}

      {/* To Account - Card */}
      <View style={{ marginBottom: 20 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "500",
            marginBottom: 8,
            color: theme.textSecondary,
          }}
        >
          {t.to || "To"}
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openToSheet}
          style={{
            ...CARD_STYLE,
            backgroundColor: theme.cardBackground,
            borderColor: toAccount ? (theme.success ?? "#16a34a") : theme.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: toAccount
                  ? `${theme.success ?? "#16a34a"}18`
                  : `${theme.border}40`,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Wallet
                size={22}
                color={
                  toAccount ? (theme.success ?? "#16a34a") : theme.textMuted
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: toAccount ? theme.text : theme.placeholder,
                }}
                numberOfLines={1}
              >
                {toAccount?.name ?? (t.select_account || "Select account")}
              </Text>
              {toAccount && (
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {t.balance || "Balance"}: ${toAccount.amount.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
          <ChevronDown size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Swap Accounts Button */}
      {fromAccount && toAccount && (
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.inputBackground,
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: theme.border,
          }}
          onPress={() => {
            const temp = fromAccount;
            setFromAccount(toAccount);
            setToAccount(temp);
          }}
        >
          <ArrowUpDown size={14} color={theme.primary} />
          <Text
            style={{
              marginLeft: 8,
              color: theme.primary,
              fontWeight: "500",
              fontSize: 14,
            }}
          >
            {t.swapAccounts || "Swap"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Bottom popup - Account picker (plain Modal to avoid Reanimated) */}
      <Modal
        visible={accountSheetMode !== null}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <Pressable
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
          onPress={closeSheet}
        >
          <Pressable
            style={{
              maxHeight: "75%",
              backgroundColor: theme.cardBackground,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: "hidden",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                paddingTop: 12,
                paddingBottom: 8,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.border,
                }}
              />
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: theme.text,
                  marginBottom: 16,
                }}
              >
                {sheetTitle}
              </Text>
              <ScrollView
                style={{ maxHeight: 320 }}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
              >
                {filteredAccounts.length === 0 ? (
                  <Text
                    style={{
                      fontSize: 15,
                      color: theme.textSecondary,
                      textAlign: "center",
                      paddingVertical: 24,
                    }}
                  >
                    {t.noAccountsAvailable || "No accounts available"}
                  </Text>
                ) : (
                  filteredAccounts.map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      activeOpacity={0.7}
                      onPress={() => handleSelectAccount(account)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 14,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        backgroundColor: theme.background,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          backgroundColor: `${theme.primary}18`,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <Wallet size={20} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: theme.text,
                          }}
                        >
                          {account.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: theme.textSecondary,
                            marginTop: 2,
                          }}
                        >
                          {t.balance || "Balance"}: $
                          {account.amount.toFixed(2)}
                        </Text>
                      </View>
                      <View style={{ transform: [{ rotate: "-90deg" }] }}>
                        <ChevronDown size={18} color={theme.textMuted} />
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Insufficient funds */}
      {transferAmount &&
        Number.parseFloat(transferAmount) > 0 &&
        fromAccount && (
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            {Number.parseFloat(transferAmount) > fromAccount.amount ? (
              <Text
                style={{
                  color: theme.error,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                {t.insufficientFunds || "Insufficient funds"}
              </Text>
            ) : null}
          </View>
        )}
    </View>
  );
}
