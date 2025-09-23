import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Wallet, ArrowRight, ArrowUpDown, X, Check } from "lucide-react-native";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import type { Account } from "~/lib";

interface TransferFormProps {
  transferAmount: string;
  setTransferAmount: (amount: string) => void;
  fromAccount: Account | null;
  setFromAccount: (account: Account | null) => void;
  toAccount: Account | null;
  setToAccount: (account: Account | null) => void;
  showAccountSelectionModal: boolean;
  setShowAccountSelectionModal: (show: boolean) => void;
  accountSelectionType: "from" | "to";
  setAccountSelectionType: (type: "from" | "to") => void;
  accounts: Account[];
  isSubmitting: boolean;
  onTransfer: () => void;
}

export default function TransferForm({
  transferAmount,
  setTransferAmount,
  fromAccount,
  setFromAccount,
  toAccount,
  setToAccount,
  showAccountSelectionModal,
  setShowAccountSelectionModal,
  accountSelectionType,
  setAccountSelectionType,
  accounts,
  isSubmitting,
  onTransfer,
}: TransferFormProps) {
  const theme = useTheme();
  const { t } = useLanguage();

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
      {/* Transfer Header */}
      <View style={{ marginBottom: 32 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: theme.text,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          {t.transferMoney}
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: theme.textSecondary,
            textAlign: "center",
          }}
        >
          {t.moveFundsBetweenAccounts}
        </Text>
      </View>

      {/* Amount Input Section */}
      <View
        style={{
          backgroundColor: theme.cardBackground,
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: theme.text,
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          {t.howMuchDoYouWantToTransfer}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              fontSize: 40,
              fontWeight: "300",
              color: theme.primary,
              marginRight: 8,
            }}
          >
            $
          </Text>
          <TextInput
            style={{
              fontSize: 40,
              fontWeight: "700",
              color: theme.text,
              textAlign: "center",
              minWidth: 120,
              borderBottomWidth: 2,
              borderBottomColor: theme.primary,
              paddingVertical: 8,
            }}
            placeholder="0.00"
            placeholderTextColor={theme.placeholder}
            value={transferAmount}
            onChangeText={setTransferAmount}
            keyboardType="numeric"
          />
        </View>

        {/* Quick Amount Buttons */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            marginTop: 16,
          }}
        >
          {[50, 100, 200, 500].map((amount) => (
            <TouchableOpacity
              key={amount}
              style={{
                backgroundColor: theme.inputBackground,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => setTransferAmount(amount.toString())}
            >
              <Text
                style={{
                  color: theme.text,
                  fontWeight: "500",
                  fontSize: 14,
                }}
              >
                ${amount}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transfer Flow Visual */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        {/* From Account Card */}
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: fromAccount
              ? theme.primary + "10"
              : theme.cardBackground,
            borderRadius: 12,
            padding: 16,
            borderWidth: 2,
            borderColor: fromAccount ? theme.primary : theme.border,
            marginRight: 12,
          }}
          onPress={() => {
            setShowAccountSelectionModal(true);
            setAccountSelectionType("from");
          }}
        >
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: theme.textSecondary,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {t.from}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: fromAccount
                    ? theme.primary
                    : theme.iconMuted,
                  borderRadius: 20,
                  padding: 8,
                  marginRight: 8,
                }}
              >
                <Wallet size={16} color="white" />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.text,
                  textAlign: "center",
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {fromAccount ? fromAccount.name : t.select_account}
              </Text>
            </View>

            {fromAccount && (
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: theme.primary,
                  }}
                >
                  ${fromAccount.amount.toFixed(2)}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.textSecondary,
                  }}
                >
                  {t.available}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Arrow */}
        <View
          style={{
            backgroundColor: theme.primary,
            borderRadius: 25,
            padding: 12,
            marginHorizontal: 4,
          }}
        >
          <ArrowRight size={20} color="white" />
        </View>

        {/* To Account Card */}
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: toAccount
              ? theme.success + "10"
              : theme.cardBackground,
            borderRadius: 12,
            padding: 16,
            borderWidth: 2,
            borderColor: toAccount ? theme.success : theme.border,
            marginLeft: 12,
          }}
          onPress={() => {
            setShowAccountSelectionModal(true);
            setAccountSelectionType("to");
          }}
        >
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: theme.textSecondary,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {t.to}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: toAccount ? theme.success : theme.iconMuted,
                  borderRadius: 20,
                  padding: 8,
                  marginRight: 8,
                }}
              >
                <Wallet size={16} color="white" />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.text,
                  textAlign: "center",
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {toAccount ? toAccount.name : t.select_account}
              </Text>
            </View>

            {toAccount && (
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: theme.success,
                  }}
                >
                  ${toAccount.amount.toFixed(2)}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.textSecondary,
                  }}
                >
                  {t.current}
                </Text>
              </View>
            )}
          </View>
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
            borderRadius: 25,
            paddingVertical: 12,
            paddingHorizontal: 20,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: theme.border,
          }}
          onPress={() => {
            const temp = fromAccount;
            setFromAccount(toAccount);
            setToAccount(temp);
          }}
        >
          <ArrowUpDown size={16} color={theme.primary} />
          <Text
            style={{
              marginLeft: 8,
              color: theme.primary,
              fontWeight: "600",
              fontSize: 14,
            }}
          >
            {t.swapAccounts}
          </Text>
        </TouchableOpacity>
      )}

      {/* Transfer Preview */}
      {fromAccount &&
        toAccount &&
        transferAmount &&
        Number.parseFloat(transferAmount) > 0 && (
          <View
            style={{
              backgroundColor: theme.cardBackground,
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.text,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {t.transferPreview}
            </Text>

            <View style={{ marginBottom: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: theme.textSecondary }}>{t.from}</Text>
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: "500",
                  }}
                >
                  {fromAccount.name}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: theme.textSecondary }}>{t.to}</Text>
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: "500",
                  }}
                >
                  {toAccount.name}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: theme.textSecondary }}>{t.amount}</Text>
                <Text
                  style={{
                    color: theme.primary,
                    fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  ${Number.parseFloat(transferAmount).toFixed(2)}
                </Text>
              </View>
            </View>

            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: theme.border,
                paddingTop: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {t.newBalance} {fromAccount.name}
                </Text>
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: "500",
                    fontSize: 12,
                  }}
                >
                  $
                  {(
                    fromAccount.amount - Number.parseFloat(transferAmount)
                  ).toFixed(2)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {t.newBalance} {toAccount.name}
                </Text>
                <Text
                  style={{
                    color: theme.success,
                    fontWeight: "500",
                    fontSize: 12,
                  }}
                >
                  $
                  {(
                    toAccount.amount + Number.parseFloat(transferAmount)
                  ).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}

      {/* Transfer Button */}
      <TouchableOpacity
        style={{
          backgroundColor:
            fromAccount &&
            toAccount &&
            transferAmount &&
            Number.parseFloat(transferAmount) > 0 &&
            Number.parseFloat(transferAmount) <= fromAccount.amount
              ? theme.primary
              : theme.border,
          borderRadius: 16,
          paddingVertical: 16,
          alignItems: "center",
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
        onPress={onTransfer}
        disabled={
          !fromAccount ||
          !toAccount ||
          !transferAmount ||
          Number.parseFloat(transferAmount) <= 0 ||
          Number.parseFloat(transferAmount) > fromAccount.amount ||
          isSubmitting
        }
      >
        {isSubmitting ? (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ActivityIndicator color="white" size="small" />
            <Text
              style={{
                color: "white",
                fontSize: 10,
                fontWeight: "600",
                marginLeft: 12,
              }}
            >
              {t.processingTransfer}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ArrowRight size={20} color="white" />
            <Text
              style={{
                color: "white",
                fontSize: 10,
                fontWeight: "500",
                marginLeft: 8,
              }}
            >
              {t.completeTransfer}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Transfer Info */}
      {transferAmount &&
        Number.parseFloat(transferAmount) > 0 &&
        fromAccount && (
          <View style={{ marginTop: 16, alignItems: "center" }}>
            {Number.parseFloat(transferAmount) > fromAccount.amount ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: theme.error + "20",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
              >
                <X size={16} color={theme.error} />
                <Text
                  style={{
                    color: theme.error,
                    fontSize: 12,
                    marginLeft: 6,
                    fontWeight: "500",
                  }}
                >
                  {t.insufficientFunds}
                </Text>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: theme.success + "20",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
              >
                <Check size={16} color={theme.success} />
                <Text
                  style={{
                    color: theme.success,
                    fontSize: 12,
                    marginLeft: 6,
                    fontWeight: "500",
                  }}
                >
                  {t.transferReady}
                </Text>
              </View>
            )}
          </View>
        )}
    </View>
  );
}
