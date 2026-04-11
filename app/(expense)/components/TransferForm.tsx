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
  ArrowLeftRight,
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

  const swapAccounts = () => {
    const temp = fromAccount;
    setFromAccount(toAccount);
    setToAccount(temp);
  };

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      return;
    }
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    setTransferAmount(cleaned);
  };

  return (
    <View style={{ paddingHorizontal: 0 }}>
      {/* Amount Input - Large at top */}
      <View style={{ alignItems: "center", marginTop: 24, marginBottom: 44 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{
              color: theme.primary,
              fontSize: 40,
              fontWeight: "600",
              marginRight: 8,
            }}
          >
            $
          </Text>
          <TextInput
            style={{
              color: theme.text,
              fontSize: 42,
              fontWeight: "600",
              minWidth: 140,
              textAlign: "center",
              lineHeight: 50,
            }}
            value={transferAmount}
            onChangeText={handleAmountChange}
            placeholder="0.00"
            placeholderTextColor={theme.placeholder}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>
      </View>

      {/* Two Rounded Boxes with Arrow - Centered */}
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          {/* From Account Box */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={openFromSheet}
            style={{
              width: 130,
              backgroundColor: fromAccount ? `${theme.primary}10` : theme.cardBackground,
              borderRadius: 20,
              padding: 16,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 150,
              borderWidth: 2,
              borderColor: fromAccount ? theme.primary : theme.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: fromAccount
                ? `${theme.primary}20`
                : `${theme.border}40`,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Wallet
              size={26}
              color={fromAccount ? theme.primary : theme.textMuted}
            />
          </View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: theme.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 4,
            }}
          >
            {t.from || "From"}
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: fromAccount ? theme.text : theme.placeholder,
              textAlign: "center",
            }}
            numberOfLines={1}
          >
            {fromAccount?.name ?? (t.select || "Select")}
          </Text>
          {fromAccount && (
            <Text
              style={{
                fontSize: 12,
                color: theme.textSecondary,
                marginTop: 4,
              }}
            >
              ${fromAccount.amount.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>

        {/* Arrow in the middle */}
        <TouchableOpacity
          onPress={fromAccount && toAccount ? swapAccounts : undefined}
          activeOpacity={fromAccount && toAccount ? 0.7 : 1}
          style={{
            backgroundColor: fromAccount && toAccount ? theme.primary : theme.border,
            borderRadius: 24,
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          {fromAccount && toAccount ? (
            <ArrowLeftRight size={22} color="white" />
          ) : (
            <ArrowRight size={22} color="white" />
          )}
        </TouchableOpacity>

        {/* To Account Box */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openToSheet}
          style={{
            width: 130,
            backgroundColor: toAccount ? `${theme.success ?? "#16a34a"}10` : theme.cardBackground,
            borderRadius: 20,
            padding: 16,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 150,
            borderWidth: 2,
            borderColor: toAccount ? (theme.success ?? "#16a34a") : theme.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: toAccount
                ? `${theme.success ?? "#16a34a"}20`
                : `${theme.border}40`,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Wallet
              size={26}
              color={toAccount ? (theme.success ?? "#16a34a") : theme.textMuted}
            />
          </View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: theme.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 4,
            }}
          >
            {t.to || "To"}
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: toAccount ? theme.text : theme.placeholder,
              textAlign: "center",
            }}
            numberOfLines={1}
          >
            {toAccount?.name ?? (t.select || "Select")}
          </Text>
          {toAccount && (
            <Text
              style={{
                fontSize: 12,
                color: theme.textSecondary,
                marginTop: 4,
              }}
            >
              ${toAccount.amount.toFixed(2)}
            </Text>
          )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Transfer Preview - when both accounts selected */}
      {fromAccount && toAccount && transferAmount && Number.parseFloat(transferAmount) > 0 && (
        <View
          style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            marginHorizontal: 23,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: theme.textSecondary,
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {t.transferPreview || "New Balances"}
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 2 }}>
                {fromAccount.name}
              </Text>
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.danger ?? "#ef4444" }}>
                ${(fromAccount.amount - Number.parseFloat(transferAmount || "0")).toFixed(2)}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 2 }}>
                {toAccount.name}
              </Text>
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.success ?? "#16a34a" }}>
                ${(toAccount.amount + Number.parseFloat(transferAmount || "0")).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
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
