import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import {
  Calendar,
  ChevronDown,
  Wallet,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { Account } from "~/lib";

type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
};

type Props = {
  amount: string;
  setAmount: (value: string) => void;
  selectedCategory: Category | null;
  setSelectedCategory: (category: Category | null) => void;
  description: string;
  setDescription: (value: string) => void;
  selectedAccount: Account | null;
  setSelectedAccount: (account: Account | null) => void;
  date: Date;
  setDate: (date: Date) => void;
  categories: Category[];
  accounts: Account[];
  theme: any;
  t: any;
};

export default function IncomeForm({
  amount,
  setAmount,
  selectedCategory,
  setSelectedCategory,
  description,
  setDescription,
  selectedAccount,
  setSelectedAccount,
  date,
  setDate,
  categories,
  accounts,
  theme,
  t,
}: Props) {
  const [showCategoryDropdown, setShowCategoryDropdown] = React.useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = React.useState(false);
  const [showDatePicker, setShowDatePicker] = React.useState(false);

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Amount Input */}
      <View style={{ alignItems: "center", marginBottom: 32 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: theme.success, fontSize: 28, fontWeight: "600", marginRight: 8 }}>
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
            value={amount}
            onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            placeholderTextColor={theme.placeholder}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>
      </View>

      {/* Category Selection */}
      <View style={{ marginBottom: 20 }}>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: selectedCategory ? selectedCategory.color : theme.border,
            backgroundColor: theme.inputBackground,
          }}
          onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            {selectedCategory ? (
              <>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: `${selectedCategory.color}20`,
                    marginRight: 12,
                  }}
                >
                  <selectedCategory.icon size={16} color={selectedCategory.color} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: "500", color: theme.text }}>
                  {selectedCategory.name}
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: 16, color: theme.placeholder }}>
                {t.select_category || "Select category"}
              </Text>
            )}
          </View>
          <ChevronDown
            size={16}
            color={theme.textMuted}
            style={{ transform: [{ rotate: showCategoryDropdown ? "180deg" : "0deg" }] }}
          />
        </TouchableOpacity>

        {showCategoryDropdown && (
          <View
            style={{
              marginTop: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.inputBackground,
              maxHeight: 250,
              overflow: "hidden",
            }}
          >
            <ScrollView
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              style={{ maxHeight: 250 }}
            >
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={{
                      padding: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor:
                        selectedCategory?.id === category.id ? `${category.color}10` : undefined,
                    }}
                    onPress={() => {
                      setSelectedCategory(category);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: `${category.color}20`,
                        marginRight: 12,
                      }}
                    >
                      <IconComponent size={16} color={category.color} />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: "500", color: theme.text }}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Description - Optional */}
      <View style={{ marginBottom: 20 }}>
        <TextInput
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            fontSize: 16,
            minHeight: 50,
            backgroundColor: theme.inputBackground,
            color: theme.text,
            textAlignVertical: "top",
          }}
          value={description}
          onChangeText={setDescription}
          placeholder={t.addNoteAboutIncome || "Add a note (optional)..."}
          placeholderTextColor={theme.placeholder}
          multiline
        />
      </View>

      {/* Account Selection */}
      <View style={{ marginBottom: 20 }}>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: selectedAccount ? theme.success : theme.border,
            backgroundColor: theme.inputBackground,
          }}
          onPress={() => setShowAccountDropdown(!showAccountDropdown)}
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
                {selectedAccount?.name || t.select_account || "Select account"}
              </Text>
              {selectedAccount && (
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                  ${formatNumber(selectedAccount.amount)}
                </Text>
              )}
            </View>
          </View>
          <ChevronDown
            size={16}
            color={theme.textMuted}
            style={{ transform: [{ rotate: showAccountDropdown ? "180deg" : "0deg" }] }}
          />
        </TouchableOpacity>

        {showAccountDropdown && (
          <View
            style={{
              marginTop: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.inputBackground,
              maxHeight: 250,
              overflow: "hidden",
            }}
          >
            <ScrollView
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              style={{ maxHeight: 250 }}
            >
              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={{
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor:
                      selectedAccount?.id === account.id ? `${theme.success}10` : undefined,
                  }}
                  onPress={() => {
                    setSelectedAccount(account);
                    setShowAccountDropdown(false);
                  }}
                >
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
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "500", color: theme.text }}>
                      {account.name}
                    </Text>
                    <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                      {account.account_type}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "500", color: theme.text }}>
                    ${formatNumber(account.amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Date Selection */}
      <View style={{ marginBottom: 20 }}>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.inputBackground,
          }}
          onPress={() => setShowDatePicker(true)}
        >
          <Calendar size={16} color={theme.success} />
          <Text style={{ marginLeft: 12, flex: 1, fontSize: 16, color: theme.text }}>
            {formatDate(date)}
          </Text>
          <ChevronDown size={16} color={theme.textMuted} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>
    </View>
  );
}
