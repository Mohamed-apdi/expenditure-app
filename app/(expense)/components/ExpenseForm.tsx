import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Calendar, ChevronDown, Wallet } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { Account } from '~/lib';

type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
};

type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

const CARD_STYLE = {
  paddingVertical: 16,
  paddingHorizontal: 16,
  borderRadius: 16,
  minHeight: 72,
  borderWidth: 1,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
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
  isRecurring: boolean;
  setIsRecurring: (value: boolean) => void;
  recurringFrequency: Frequency;
  setRecurringFrequency: (freq: Frequency) => void;
  categories: Category[];
  accounts: Account[];
  theme: any;
  t: any;
};

export default function ExpenseForm({
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
  isRecurring,
  setIsRecurring,
  recurringFrequency,
  setRecurringFrequency,
  categories,
  accounts,
  theme,
  t,
}: Props) {
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);

  const openDateSheet = useCallback(() => setDateSheetOpen(true), []);
  const closeDateSheet = useCallback(() => setDateSheetOpen(false), []);
  const openCategorySheet = useCallback(() => setCategorySheetOpen(true), []);
  const closeCategorySheet = useCallback(() => setCategorySheetOpen(false), []);
  const openAccountSheet = useCallback(() => setAccountSheetOpen(true), []);
  const closeAccountSheet = useCallback(() => setAccountSheetOpen(false), []);

  const handleSelectCategory = useCallback(
    (category: Category) => {
      setSelectedCategory(category);
      setCategorySheetOpen(false);
    },
    [setSelectedCategory]
  );

  const handleSelectAccount = useCallback(
    (account: Account) => {
      setSelectedAccount(account);
      setAccountSheetOpen(false);
    },
    [setSelectedAccount]
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const onDateChange = useCallback(
    (event: any, selectedDate?: Date) => {
      if (selectedDate) {
        setDate(selectedDate);
        setDateSheetOpen(false);
      }
    },
    [setDate]
  );

  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Amount Input */}
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{
              color: theme.primary,
              fontSize: 28,
              fontWeight: '600',
              marginRight: 8,
            }}>
            $
          </Text>
          <TextInput
            style={{
              color: theme.text,
              fontSize: 28,
              fontWeight: '600',
              minWidth: 100,
              textAlign: 'center',
            }}
            value={amount}
            onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
            placeholder="0.00"
            placeholderTextColor={theme.placeholder}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>
      </View>

      {/* Category Selection - Card opens bottom sheet */}
      <View style={{ marginBottom: 20 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            marginBottom: 8,
            color: theme.textSecondary,
          }}>
          {t.select_category || 'Category'}
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openCategorySheet}
          style={{
            ...CARD_STYLE,
            backgroundColor: theme.cardBackground,
            borderColor: selectedCategory ? selectedCategory.color : theme.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: selectedCategory
                  ? `${selectedCategory.color}18`
                  : `${theme.border}40`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}>
              {selectedCategory ? (
                <selectedCategory.icon
                  size={22}
                  color={selectedCategory.color}
                />
              ) : (
                <ChevronDown size={22} color={theme.textMuted} />
              )}
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: selectedCategory ? theme.text : theme.placeholder,
              }}
              numberOfLines={1}>
              {selectedCategory?.name ?? (t.select_category || 'Select category')}
            </Text>
          </View>
          <ChevronDown size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Category bottom sheet */}
      <Modal
        visible={categorySheetOpen}
        transparent
        animationType="slide"
        onRequestClose={closeCategorySheet}>
        <Pressable
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
          onPress={closeCategorySheet}>
          <Pressable
            style={{
              maxHeight: '75%',
              backgroundColor: theme.cardBackground,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: 'hidden',
            }}
            onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                paddingTop: 12,
                paddingBottom: 8,
                alignItems: 'center',
              }}>
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
                  fontWeight: '700',
                  color: theme.text,
                  marginBottom: 16,
                }}>
                {t.select_category || 'Select category'}
              </Text>
              <ScrollView
                style={{ maxHeight: 320 }}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}>
                {categories
                  .filter(
                    (cat) => cat.name && cat.name !== 'undefined',
                  )
                  .map((category) => {
                    const CategoryIcon = category.icon;
                    return (
                      <TouchableOpacity
                        key={category.id}
                        activeOpacity={0.7}
                        onPress={() => handleSelectCategory(category)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 14,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          backgroundColor: theme.background,
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: theme.border,
                        }}>
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            backgroundColor: `${category.color}18`,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                          }}>
                          <CategoryIcon size={20} color={category.color} />
                        </View>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: theme.text,
                            flex: 1,
                          }}>
                          {category.name}
                        </Text>
                        <View style={{ transform: [{ rotate: '-90deg' }] }}>
                          <ChevronDown size={18} color={theme.textMuted} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
            textAlignVertical: 'top',
          }}
          value={description}
          onChangeText={setDescription}
          placeholder={
            t.add_note_about_transaction || 'Add a note (optional)...'
          }
          placeholderTextColor={theme.placeholder}
          multiline
        />
      </View>

      {/* Account Selection - Card opens bottom sheet */}
      <View style={{ marginBottom: 20 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            marginBottom: 8,
            color: theme.textSecondary,
          }}>
          {t.select_account || 'Account'}
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openAccountSheet}
          style={{
            ...CARD_STYLE,
            backgroundColor: theme.cardBackground,
            borderColor: selectedAccount ? theme.primary : theme.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: selectedAccount
                  ? `${theme.primary}18`
                  : `${theme.border}40`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}>
              <Wallet
                size={22}
                color={selectedAccount ? theme.primary : theme.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: selectedAccount ? theme.text : theme.placeholder,
                }}
                numberOfLines={1}>
                {selectedAccount?.name ??
                  (t.select_account || 'Select account')}
              </Text>
              {selectedAccount && (
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.textSecondary,
                    marginTop: 2,
                  }}>
                  {t.balance || 'Balance'}: $
                  {selectedAccount.amount.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
          <ChevronDown size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Account bottom sheet */}
      <Modal
        visible={accountSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={closeAccountSheet}>
        <Pressable
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
          onPress={closeAccountSheet}>
          <Pressable
            style={{
              maxHeight: '75%',
              backgroundColor: theme.cardBackground,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: 'hidden',
            }}
            onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                paddingTop: 12,
                paddingBottom: 8,
                alignItems: 'center',
              }}>
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
                  fontWeight: '700',
                  color: theme.text,
                  marginBottom: 16,
                }}>
                {t.select_account || 'Select account'}
              </Text>
              <ScrollView
                style={{ maxHeight: 320 }}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}>
                {accounts.length === 0 ? (
                  <Text
                    style={{
                      fontSize: 15,
                      color: theme.textSecondary,
                      textAlign: 'center',
                      paddingVertical: 24,
                    }}>
                    {t.noAccountsAvailable || 'No accounts available'}
                  </Text>
                ) : (
                  accounts.map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      activeOpacity={0.7}
                      onPress={() => handleSelectAccount(account)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        backgroundColor: theme.background,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          backgroundColor: `${theme.primary}18`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}>
                        <Wallet size={20} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: theme.text,
                          }}>
                          {account.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: theme.textSecondary,
                            marginTop: 2,
                          }}>
                          {t.balance || 'Balance'}: $
                          {account.amount.toFixed(2)}
                        </Text>
                      </View>
                      <View style={{ transform: [{ rotate: '-90deg' }] }}>
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

      {/* Date Selection - Card opens bottom sheet */}
      <View style={{ marginBottom: 20 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            marginBottom: 8,
            color: theme.textSecondary,
          }}>
          {t.date || 'Date'}
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openDateSheet}
          style={{
            ...CARD_STYLE,
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: `${theme.primary}18`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}>
              <Calendar size={22} color={theme.primary} />
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.text,
              }}
              numberOfLines={1}>
              {formatDate(date)}
            </Text>
          </View>
          <ChevronDown size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Date bottom sheet */}
      <Modal
        visible={dateSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={closeDateSheet}>
        <Pressable
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
          onPress={closeDateSheet}>
          <Pressable
            style={{
              backgroundColor: theme.cardBackground,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: 'hidden',
              paddingBottom: 24,
            }}
            onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                paddingTop: 12,
                paddingBottom: 8,
                alignItems: 'center',
              }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.border,
                }}
              />
            </View>
            <View style={{ paddingHorizontal: 20 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: theme.text,
                  marginBottom: 16,
                }}>
                {t.selectDate || 'Select date'}
              </Text>
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Recurring Toggle */}
      <View style={{ marginBottom: 24 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: theme.text }}>
            {t.repeatThis || 'Repeat this'}
          </Text>
          <TouchableOpacity
            style={{
              width: 44,
              height: 26,
              borderRadius: 13,
              backgroundColor: isRecurring ? theme.primary : theme.stepInactive,
              justifyContent: 'center',
              paddingHorizontal: 2,
            }}
            onPress={() => setIsRecurring(!isRecurring)}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: '#ffffff',
                alignSelf: isRecurring ? 'flex-end' : 'flex-start',
              }}
            />
          </TouchableOpacity>
        </View>

        {isRecurring && (
          <View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['weekly', 'monthly', 'yearly'] as Frequency[]).map((freq) => {
                const isSelected = recurringFrequency === freq;
                return (
                  <TouchableOpacity
                    key={freq}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: isSelected
                        ? theme.primary
                        : theme.cardBackground,
                      borderWidth: 1,
                      borderColor: isSelected ? theme.primary : theme.border,
                    }}
                    onPress={() => setRecurringFrequency(freq)}>
                    <Text
                      style={{
                        textAlign: 'center',
                        fontWeight: isSelected ? '500' : '400',
                        fontSize: 14,
                        color: isSelected ? theme.primaryText : theme.text,
                      }}>
                      {freq === 'weekly'
                        ? t.weekly
                        : freq === 'monthly'
                          ? t.monthly
                          : t.yearly}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
