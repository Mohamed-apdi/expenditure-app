import React, { useState, useCallback } from "react";
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
  Utensils,
  Home,
  Bus,
  Zap,
  Film,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  Smile,
  CreditCard,
  Gift,
  HandHeart,
  Luggage,
  Baby,
  Dumbbell,
  Smartphone,
  Sofa,
  Wrench,
  Receipt,
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

type Frequency = "daily" | "weekly" | "monthly" | "yearly";

interface ExpenseFormProps {
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
  isRecurring: boolean;
  setIsRecurring: (recurring: boolean) => void;
  recurringFrequency: Frequency;
  setRecurringFrequency: (frequency: Frequency) => void;
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

export default function ExpenseForm({
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
  isRecurring,
  setIsRecurring,
  recurringFrequency,
  setRecurringFrequency,
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
}: ExpenseFormProps) {
  const theme = useTheme();
  const { t } = useLanguage();

  const expenseCategories: Category[] = [
    { id: "food", name: t.foodAndDrinks, icon: Utensils, color: "#059669" },
    { id: "rent", name: t.homeAndRent, icon: Home, color: "#0891b2" },
    { id: "transport", name: t.travel, icon: Bus, color: "#3b82f6" },
    { id: "utilities", name: t.bills, icon: Zap, color: "#f97316" },
    { id: "entertainment", name: t.fun, icon: Film, color: "#8b5cf6" },
    { id: "healthcare", name: t.health, icon: HeartPulse, color: "#dc2626" },
    { id: "shopping", name: t.shopping, icon: ShoppingBag, color: "#06b6d4" },
    {
      id: "education",
      name: t.learning,
      icon: GraduationCap,
      color: "#84cc16",
    },
    {
      id: "personal_care",
      name: t.personalCare,
      icon: Smile,
      color: "#ec4899",
    },
    { id: "debt", name: t.loans, icon: CreditCard, color: "#f97316" },
    { id: "gifts", name: t.gifts, icon: Gift, color: "#8b5cf6" },
    { id: "charity", name: t.donations, icon: HandHeart, color: "#ef4444" },
    { id: "travel", name: t.vacation, icon: Luggage, color: "#3b82f6" },
    { id: "kids", name: t.children, icon: Baby, color: "#ec4899" },
    { id: "fitness", name: t.gymAndSports, icon: Dumbbell, color: "#059669" },
    {
      id: "electronics",
      name: t.electronics,
      icon: Smartphone,
      color: "#64748b",
    },
    { id: "furniture", name: t.furniture, icon: Sofa, color: "#f59e0b" },
    { id: "repairs", name: t.repairs, icon: Wrench, color: "#3b82f6" },
    { id: "taxes", name: t.taxes, icon: Receipt, color: "#ef4444" },
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
                {expenseCategories.map((category) => {
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

      {/* Description Field */}
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
          placeholder={t.add_note_about_transaction}
          placeholderTextColor={theme.placeholder}
          multiline
        />
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

      {/* Recurring Toggle */}
      <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: theme.text,
              fontFamily: "Work Sans",
            }}
          >
            {t.repeatThis}
          </Text>
          <TouchableOpacity
            style={{
              width: 50,
              height: 30,
              borderRadius: 15,
              backgroundColor: isRecurring ? theme.success : theme.stepInactive,
              justifyContent: "center",
              paddingHorizontal: 2,
            }}
            onPress={() => setIsRecurring(!isRecurring)}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: "#ffffff",
                alignSelf: isRecurring ? "flex-end" : "flex-start",
              }}
            />
          </TouchableOpacity>
        </View>

        {isRecurring && (
          <View>
            <Text
              style={{
                marginBottom: 12,
                fontSize: 16,
                color: theme.textSecondary,
              }}
            >
              {t.howOften}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {["weekly", "monthly", "yearly"].map((freq) => {
                const isSelected = recurringFrequency === freq;
                return (
                  <TouchableOpacity
                    key={freq}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 8,
                      backgroundColor: isSelected
                        ? theme.primary
                        : theme.cardBackground,
                      borderWidth: 1,
                      borderColor: isSelected ? theme.primary : theme.border,
                    }}
                    onPress={() => setRecurringFrequency(freq as Frequency)}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        fontWeight: "600",
                        color: isSelected ? theme.primaryText : theme.text,
                      }}
                    >
                      {freq === "weekly"
                        ? t.weekly
                        : freq === "monthly"
                          ? t.monthly
                          : freq === "yearly"
                            ? t.yearly
                            : freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </>
  );
}
