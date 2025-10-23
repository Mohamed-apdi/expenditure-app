import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import {
  Wallet,
  ArrowRight,
  ArrowUpDown,
  ChevronDown,
  X,
  Check,
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
  const [showAccountSelectionModal, setShowAccountSelectionModal] = React.useState(false);
  const [accountSelectionType, setAccountSelectionType] = React.useState<"from" | "to">("from");

  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Amount Input */}
      <View style={{ alignItems: "center", marginBottom: 32 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: theme.primary, fontSize: 28, fontWeight: "600", marginRight: 8 }}>
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

      {/* From Account */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8, color: theme.textSecondary }}>
          {t.from || "From"}
        </Text>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: fromAccount ? theme.primary : theme.border,
            backgroundColor: theme.inputBackground,
          }}
          onPress={() => {
            setShowAccountSelectionModal(true);
            setAccountSelectionType("from");
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: `${theme.primary}20`,
                marginRight: 12,
              }}
            >
              <Wallet size={16} color={theme.primary} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: "500", color: theme.text }}>
                {fromAccount?.name || t.select_account || "Select account"}
              </Text>
              {fromAccount && (
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                  ${fromAccount.amount.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
          <ChevronDown size={16} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Transfer Icon */}
      {fromAccount && toAccount && (
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <View style={{ backgroundColor: theme.primary, borderRadius: 20, padding: 8 }}>
            <ArrowRight size={16} color="white" />
          </View>
        </View>
      )}

      {/* To Account */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8, color: theme.textSecondary }}>
          {t.to || "To"}
        </Text>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: toAccount ? theme.success : theme.border,
            backgroundColor: theme.inputBackground,
          }}
          onPress={() => {
            setShowAccountSelectionModal(true);
            setAccountSelectionType("to");
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: `${theme.success}20`,
                marginRight: 12,
              }}
            >
              <Wallet size={16} color={theme.success} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: "500", color: theme.text }}>
                {toAccount?.name || t.select_account || "Select account"}
              </Text>
              {toAccount && (
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                  ${toAccount.amount.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
          <ChevronDown size={16} color={theme.textMuted} />
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
          <Text style={{ marginLeft: 8, color: theme.primary, fontWeight: "500", fontSize: 14 }}>
            {t.swapAccounts || "Swap"}
          </Text>
        </TouchableOpacity>
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
              : theme.stepInactive,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: "center",
          marginBottom: 16,
        }}
        onPress={handleTransfer}
        disabled={
          !fromAccount ||
          !toAccount ||
          !transferAmount ||
          Number.parseFloat(transferAmount) <= 0 ||
          (fromAccount && Number.parseFloat(transferAmount) > fromAccount.amount) ||
          isSubmitting
        }
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
            {t.completeTransfer || "Transfer"}
          </Text>
        )}
      </TouchableOpacity>

      {/* Transfer Status */}
      {transferAmount && Number.parseFloat(transferAmount) > 0 && fromAccount && (
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          {Number.parseFloat(transferAmount) > fromAccount.amount ? (
            <Text style={{ color: theme.error, fontSize: 14, fontWeight: "500" }}>
              {t.insufficientFunds || "Insufficient funds"}
            </Text>
          ) : null}
        </View>
      )}

      {/* Account Selection Modal */}
      <Modal
        visible={showAccountSelectionModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAccountSelectionModal(false)}
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 }}>
          <View
            style={{
              backgroundColor: theme.cardBackground,
              borderRadius: 16,
              padding: 20,
              width: "100%",
              maxWidth: 400,
              maxHeight: "80%",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "600" }}>
                {accountSelectionType === "from" ? t.from || "From" : t.to || "To"}
              </Text>
              <TouchableOpacity onPress={() => setShowAccountSelectionModal(false)}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor:
                      (accountSelectionType === "from" && fromAccount?.id === account.id) ||
                      (accountSelectionType === "to" && toAccount?.id === account.id)
                        ? theme.primary
                        : theme.border,
                    backgroundColor:
                      (accountSelectionType === "from" && fromAccount?.id === account.id) ||
                      (accountSelectionType === "to" && toAccount?.id === account.id)
                        ? `${theme.primary}10`
                        : theme.inputBackground,
                    marginBottom: 8,
                  }}
                  onPress={() => {
                    if (accountSelectionType === "from") {
                      setFromAccount(account);
                    } else {
                      setToAccount(account);
                    }
                    setShowAccountSelectionModal(false);
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: `${theme.primary}20`,
                          marginRight: 12,
                        }}
                      >
                        <Wallet size={16} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: theme.text }}>
                          {account.name}
                        </Text>
                        <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                          {account.account_type}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: "500", color: theme.text }}>
                      ${account.amount.toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
