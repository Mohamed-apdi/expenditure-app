import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  Calendar,
  ChevronDown,
  Wallet,
  DollarSign,
  Zap,
  Clock,
  Briefcase,
  Home,
  ShoppingBag,
  Award,
  Laptop,
  Gift,
  User,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import type { Account } from "~/lib";

type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
};

interface IncomeFormProps {
  amount: string;
  setAmount: (amount: string) => void;
  description: string;
  setDescription: (description: string) => void;
  selectedCategory: Category | null;
  setSelectedCategory: (category: Category | null) => void;
  date: Date;
  setDate: (date: Date) => void;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  selectedAccount: Account | null;
  setSelectedAccount: (account: Account | null) => void;
  accounts: Account[];
  loadingAccounts: boolean;
  showAccountDropdown: boolean;
  setShowAccountDropdown: (show: boolean) => void;
  showCategoryDropdown: boolean;
  setShowCategoryDropdown: (show: boolean) => void;
  onDateChange: (event: any, selectedDate?: Date) => void;
  formatDate: (date: Date) => string;
}

export default function IncomeForm({
  amount,
  setAmount,
  description,
  setDescription,
  selectedCategory,
  setSelectedCategory,
  date,
  setDate,
  showDatePicker,
  setShowDatePicker,
  selectedAccount,
  setSelectedAccount,
  accounts,
  loadingAccounts,
  showAccountDropdown,
  setShowAccountDropdown,
  showCategoryDropdown,
  setShowCategoryDropdown,
  onDateChange,
  formatDate,
}: IncomeFormProps) {
  const theme = useTheme();
  const { t } = useLanguage();

  const incomeCategories: Category[] = [
    { id: "salary", name: t.jobSalary, icon: DollarSign, color: "#059669" },
    { id: "bonus", name: t.bonus, icon: Zap, color: "#3b82f6" },
    { id: "part_time", name: t.partTimeWork, icon: Clock, color: "#f97316" },
    { id: "business", name: t.business, icon: Briefcase, color: "#8b5cf6" },
    { id: "rental", name: t.rentIncome, icon: Home, color: "#84cc16" },
    { id: "sales", name: t.sales, icon: ShoppingBag, color: "#64748b" },
    { id: "awards", name: t.awards, icon: Award, color: "#8b5cf6" },
    { id: "freelance", name: t.freelance, icon: Laptop, color: "#f97316" },
    { id: "gifts", name: t.giftsReceived, icon: Gift, color: "#8b5cf6" },
    { id: "pension", name: t.pension, icon: User, color: "#64748b" },
  ];

  return (
    <>
      {/* Amount Input */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 24,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: theme.textSecondary,
            marginBottom: 16,
            fontSize: 16,
            fontWeight: "500",
          }}
        >
          {t.how_much}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              color: theme.primary,
              fontSize: 32,
              fontWeight: "700",
              marginRight: 8,
            }}
          >
            $
          </Text>
          <TextInput
            style={{
              color: theme.text,
              fontSize: 36,
              fontWeight: "700",
              minWidth: 120,
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

      {/* Category Section */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            marginBottom: 16,
            color: theme.text,
            fontFamily: "Work Sans",
          }}
        >
          {t.choose_category}
        </Text>

        <View>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.inputBackground,
            }}
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {selectedCategory ? (
                <>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: `${selectedCategory.color}20`,
                      marginRight: 16,
                    }}
                  >
                    <selectedCategory.icon
                      size={20}
                      color={selectedCategory.color}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: theme.text,
                    }}
                  >
                    {selectedCategory.name}
                  </Text>
                </>
              ) : (
                <Text
                  style={{
                    fontSize: 16,
                    color: theme.placeholder,
                  }}
                >
                  {t.select_category}
                </Text>
              )}
            </View>
            <ChevronDown
              size={16}
              color={theme.iconMuted}
              style={{
                transform: [
                  {
                    rotate: showCategoryDropdown ? "180deg" : "0deg",
                  },
                ],
              }}
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
                maxHeight: 300,
              }}
            >
              <ScrollView>
                {incomeCategories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={{
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor:
                          selectedCategory?.id === category.id
                            ? `${category.color}10`
                            : undefined,
                      }}
                      onPress={() => {
                        setSelectedCategory(category);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: `${category.color}20`,
                          marginRight: 16,
                        }}
                      >
                        <IconComponent size={20} color={category.color} />
                      </View>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: theme.text,
                        }}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Account Selection */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            marginBottom: 16,
            color: theme.text,
            fontFamily: "Work Sans",
          }}
        >
          {t.select_account}
        </Text>
        {loadingAccounts ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <View>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.inputBackground,
              }}
              onPress={() => setShowAccountDropdown(!showAccountDropdown)}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: `${theme.primary}30`,
                    marginRight: 16,
                  }}
                >
                  <Wallet size={20} color={theme.primary} />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: theme.text,
                    }}
                  >
                    {selectedAccount?.name || t.select_account}
                  </Text>
                  {selectedAccount && (
                    <Text
                      style={{
                        fontSize: 14,
                        color: theme.textSecondary,
                      }}
                    >
                      {selectedAccount.account_type}{" "}
                      {selectedAccount.amount.toFixed(2)}
                    </Text>
                  )}
                </View>
              </View>
              <ChevronDown
                size={16}
                color={theme.iconMuted}
                style={{
                  transform: [
                    { rotate: showAccountDropdown ? "180deg" : "0deg" },
                  ],
                }}
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
                  maxHeight: 300,
                }}
              >
                <ScrollView>
                  {accounts.map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      style={{
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor:
                          selectedAccount?.id === account.id
                            ? `${theme.primary}10`
                            : undefined,
                      }}
                      onPress={() => {
                        setSelectedAccount(account);
                        setShowAccountDropdown(false);
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: `${theme.primary}30`,
                          marginRight: 16,
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
                            fontSize: 14,
                            color: theme.textSecondary,
                          }}
                        >
                          {account.account_type}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: theme.text,
                        }}
                      >
                        £{account.amount.toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Description Field */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 16,
            color: theme.text,
            fontFamily: "Work Sans",
          }}
        >
          {t.whats_this_for}
        </Text>
        <TextInput
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            fontSize: 16,
            minHeight: 80,
            backgroundColor: theme.inputBackground,
            color: theme.text,
            textAlignVertical: "top",
          }}
          value={description}
          onChangeText={setDescription}
          placeholder={t.addNoteAboutIncome}
          placeholderTextColor={theme.placeholder}
          multiline
        />
      </View>

      {/* Date Selection */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            marginBottom: 16,
            color: theme.text,
            fontFamily: "Work Sans",
          }}
        >
          {t.when}
        </Text>
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
          <Calendar size={20} color={theme.primary} />
          <Text
            style={{
              marginLeft: 12,
              flex: 1,
              fontSize: 16,
              color: theme.text,
            }}
          >
            {formatDate(date)}
          </Text>
          <ChevronDown size={16} color={theme.iconMuted} />
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
    </>
  );
}
