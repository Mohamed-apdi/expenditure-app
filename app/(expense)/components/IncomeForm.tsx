import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Calendar, ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import type { Account } from '~/lib';

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
  const [showDatePicker, setShowDatePicker] = React.useState(false);

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{
              color: theme.success,
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

      {/* Category Selection */}
      <View style={{ marginBottom: 20 }}>
        <RNPickerSelect
          onValueChange={(value) => {
            const category = categories.find((cat) => cat.id === value);
            setSelectedCategory(category || null);
          }}
          items={categories
            .filter(
              (category) => category.name && category.name !== 'undefined',
            )
            .map((category) => ({
              label: category.name,
              value: category.id,
            }))}
          value={selectedCategory?.id}
          placeholder={{
            label: t.select_category || 'Select category',
            value: null,
          }}
          style={{
            inputIOS: {
              fontSize: 16,
              paddingVertical: 16,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: selectedCategory
                ? selectedCategory.color
                : theme.border,
              backgroundColor: theme.inputBackground,
              color: selectedCategory ? theme.text : theme.placeholder,
              minHeight: 50,
            },
            inputAndroid: {
              fontSize: 16,
              paddingVertical: 16,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: selectedCategory
                ? selectedCategory.color
                : theme.border,
              backgroundColor: theme.inputBackground,
              color: selectedCategory ? theme.text : theme.placeholder,
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
                  backgroundColor: 'transparent',
                  borderTopWidth: 6,
                  borderTopColor: theme.textMuted,
                  borderRightWidth: 6,
                  borderRightColor: 'transparent',
                  borderLeftWidth: 6,
                  borderLeftColor: 'transparent',
                  width: 0,
                  height: 0,
                }}
              />
            );
          }}
          useNativeAndroidPickerStyle={false}
        />
        {selectedCategory && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 8,
              marginLeft: 4,
            }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: `${selectedCategory.color}20`,
                marginRight: 8,
              }}>
              <selectedCategory.icon size={14} color={selectedCategory.color} />
            </View>
            <Text
              style={{
                fontSize: 14,
                color: theme.textSecondary,
              }}>
              {selectedCategory.name}
            </Text>
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
            textAlignVertical: 'top',
          }}
          value={description}
          onChangeText={setDescription}
          placeholder={t.addNoteAboutIncome || 'Add a note (optional)...'}
          placeholderTextColor={theme.placeholder}
          multiline
        />
      </View>

      {/* Account Selection */}
      <View style={{ marginBottom: 20 }}>
        <RNPickerSelect
          onValueChange={(value) => {
            const account = accounts.find((acc) => acc.id === value);
            setSelectedAccount(account || null);
          }}
          items={accounts.map((account) => ({
            label: `${account.name}`,
            value: account.id,
          }))}
          value={selectedAccount?.id}
          placeholder={{
            label: t.select_account || 'Select account',
            value: null,
          }}
          style={{
            inputIOS: {
              fontSize: 16,
              paddingVertical: 16,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: selectedAccount ? theme.success : theme.border,
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
              borderColor: selectedAccount ? theme.success : theme.border,
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
                  backgroundColor: 'transparent',
                  borderTopWidth: 6,
                  borderTopColor: theme.textMuted,
                  borderRightWidth: 6,
                  borderRightColor: 'transparent',
                  borderLeftWidth: 6,
                  borderLeftColor: 'transparent',
                  width: 0,
                  height: 0,
                }}
              />
            );
          }}
          useNativeAndroidPickerStyle={false}
        />
        {selectedAccount && (
          <Text
            style={{
              fontSize: 14,
              color: theme.textSecondary,
              marginTop: 8,
              marginLeft: 4,
            }}>
            Balance: ${formatNumber(selectedAccount.amount)}
          </Text>
        )}
      </View>

      {/* Date Selection */}
      <View style={{ marginBottom: 20 }}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.inputBackground,
          }}
          onPress={() => setShowDatePicker(true)}>
          <Calendar size={16} color={theme.success} />
          <Text
            style={{
              marginLeft: 12,
              flex: 1,
              fontSize: 16,
              color: theme.text,
            }}>
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
