import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import {
  ArrowRight,
  ArrowUpDown,
} from "lucide-react-native";
import RNPickerSelect from "react-native-picker-select";
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
        <RNPickerSelect
          onValueChange={(value) => {
            const account = accounts.find((acc) => acc.id === value);
            setFromAccount(account || null);
          }}
          items={accounts
            .filter((acc) => acc.id !== toAccount?.id)
            .map((account) => ({
              label: `${account.name}`,
              value: account.id,
            }))}
          value={fromAccount?.id}
          placeholder={{
            label: t.select_account || "Select account",
            value: null,
          }}
          style={{
            inputIOS: {
              fontSize: 16,
              paddingVertical: 16,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: fromAccount ? theme.primary : theme.border,
              backgroundColor: theme.inputBackground,
              color: theme.text,
              minHeight: 50,
            },
            inputAndroid: {
              fontSize: 16,
              paddingVertical: 16,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: fromAccount ? theme.primary : theme.border,
              backgroundColor: theme.inputBackground,
              color: theme.text,
              minHeight: 50,
            },
            placeholder: {
              color: theme.placeholder,
            },
            iconContainer: {
              top: 18,
              right: 16,
            },
          }}
          Icon={() => {
            return (
              <View
                style={{
                  backgroundColor: "transparent",
                  borderTopWidth: 6,
                  borderTopColor: theme.textMuted,
                  borderRightWidth: 6,
                  borderRightColor: "transparent",
                  borderLeftWidth: 6,
                  borderLeftColor: "transparent",
                  width: 0,
                  height: 0,
                }}
              />
            );
          }}
          useNativeAndroidPickerStyle={false}
        />
        {fromAccount && (
          <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 8, marginLeft: 4 }}>
            Balance: ${fromAccount.amount.toFixed(2)}
          </Text>
        )}
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
        <RNPickerSelect
          onValueChange={(value) => {
            const account = accounts.find((acc) => acc.id === value);
            setToAccount(account || null);
          }}
          items={accounts
            .filter((acc) => acc.id !== fromAccount?.id)
            .map((account) => ({
            label: `${account.name} - $${account.amount.toFixed(2)}`,
              value: account.id,
            }))}
          value={toAccount?.id}
          placeholder={{
            label: t.select_account || "Select account",
            value: null,
          }}
          style={{
            inputIOS: {
              fontSize: 16,
              paddingVertical: 16,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: toAccount ? theme.success : theme.border,
              backgroundColor: theme.inputBackground,
              color: theme.text,
              minHeight: 50,
            },
            inputAndroid: {
              fontSize: 16,
              paddingVertical: 16,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: toAccount ? theme.success : theme.border,
              backgroundColor: theme.inputBackground,
              color: theme.text,
              minHeight: 50,
            },
            placeholder: {
              color: theme.placeholder,
            },
            iconContainer: {
              top: 18,
              right: 16,
            },
          }}
          Icon={() => {
            return (
              <View
                style={{
                  backgroundColor: "transparent",
                  borderTopWidth: 6,
                  borderTopColor: theme.textMuted,
                  borderRightWidth: 6,
                  borderRightColor: "transparent",
                  borderLeftWidth: 6,
                  borderLeftColor: "transparent",
                  width: 0,
                  height: 0,
                }}
              />
            );
          }}
          useNativeAndroidPickerStyle={false}
        />
        {toAccount && (
          <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 8, marginLeft: 4 }}>
            Balance: ${toAccount.amount.toFixed(2)}
          </Text>
        )}
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

    </View>
  );
}
