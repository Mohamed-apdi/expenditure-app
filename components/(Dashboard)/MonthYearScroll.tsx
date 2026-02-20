import { useMemo, useState, useEffect, useRef } from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { useLanguage, useAccount, useTheme } from '~/lib';

const months = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

type MonthYearScrollerProps = {
  variant?: 'light' | 'dark';
  onMonthChange: (month: number, year: number) => void;
  fetchMonthData: (
    month: number,
    year: number,
  ) => Promise<{
    income: number;
    expense: number;
    balance: number;
  }>;
  refreshTrigger?: number;
};

export default function MonthYearScroller({
  variant = 'dark',
  onMonthChange,
  fetchMonthData,
  refreshTrigger = 0,
}: MonthYearScrollerProps) {
  const current = new Date();
  const currentYear = current.getFullYear();
  const currentMonth = current.getMonth();
  const { t } = useLanguage();
  const theme = useTheme();
  const { selectedAccount, accounts } = useAccount();
  const isLight = variant === 'light';
  const [monthData, setMonthData] = useState<{
    income: number;
    expense: number;
    balance: number;
  }>({ income: 0, expense: 0, balance: 0 });

  // Calculate current balance from selected account only
  const currentBalance = useMemo(() => {
    // Only show selected account balance, not sum of all accounts
    return selectedAccount?.amount || 0;
  }, [selectedAccount]);

  // Add ref for FlatList to enable programmatic scrolling
  const flatListRef = useRef<FlatList>(null);

  // Generate month/year list from 2024 → current year
  const data = useMemo(() => {
    const arr: string[] = [];
    for (let y = 2025; y <= currentYear; y++) {
      for (let m = 0; m < 12; m++) {
        if (y === currentYear && m > currentMonth) break;
        arr.push(`${months[m]} ${y}`);
      }
    }
    return arr;
  }, [currentYear, currentMonth]);

  // Default selected = current month/year
  const [selected, setSelected] = useState(
    `${months[currentMonth]} ${currentYear}`,
  );

  // Estimate item width for getItemLayout
  // Each item has px-4 (16px padding) + mx-1 (4px margin) + text width (~80px average)
  const estimatedItemWidth = 100; // Approximate width per item

  // Scroll to selected month when component mounts or data changes
  useEffect(() => {
    if (flatListRef.current && data.length > 0) {
      const selectedIndex = data.findIndex((item) => item === selected);
      if (selectedIndex >= 0) {
        // Add a small delay to ensure the FlatList is fully rendered
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: selectedIndex,
            animated: false, // Always instant scroll
            viewPosition: 0.5, // Center the selected item
          });
        }, 100);
      }
    }
  }, [data, selected]);

  useEffect(() => {
    // Parse the selected month/year
    const [monthStr, yearStr] = selected.split(' ');
    const monthIndex = months.indexOf(monthStr);
    const year = parseInt(yearStr);

    // Fetch data for the selected month (also when selectedAccount changes so income/expense/transactions update like balance)
    const loadMonthData = async () => {
      try {
        const data = await fetchMonthData(monthIndex, year);
        setMonthData(data);
        onMonthChange(monthIndex, year);
      } catch (error) {
        console.error('Error loading month data:', error);
      }
    };

    // Only load data if we have valid month/year values
    if (monthIndex >= 0 && year > 0) {
      loadMonthData();
    }
  }, [selected, refreshTrigger, selectedAccount?.id, fetchMonthData, onMonthChange]);

  return (
    <View className="py-4">
      {/* Month scroller */}
      <FlatList
        ref={flatListRef}
        data={data}
        horizontal
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        getItemLayout={(data, index) => ({
          length: estimatedItemWidth,
          offset: estimatedItemWidth * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          // Fallback: scroll to offset if index-based scroll fails
          const wait = new Promise((resolve) => setTimeout(resolve, 500));
          wait.then(() => {
            if (flatListRef.current && data.length > info.index) {
              flatListRef.current.scrollToIndex({
                index: info.index,
                animated: false,
              });
            }
          });
        }}
        renderItem={({ item }) => {
          const isActive = item === selected;
          const pillBg = isActive
            ? isLight
              ? theme.primary
              : '#ffffff'
            : 'transparent';
          const pillText = isActive
            ? isLight
              ? '#fff'
              : theme.primary
            : isLight
              ? theme.textSecondary
              : 'rgba(255,255,255,0.9)';
          return (
            <TouchableOpacity
              onPress={() => setSelected(item)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                marginHorizontal: 4,
                borderRadius: 20,
                backgroundColor: pillBg,
              }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? '700' : '500',
                  color: pillText,
                }}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Balance Card */}
      <View
        style={[
          styles.balanceCard,
          isLight && {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
            borderWidth: 1,
            marginHorizontal: 0,
          },
        ]}>
        <View style={styles.balanceHeader}>
          <Text
            style={[
              styles.balanceLabel,
              isLight && { color: theme.textSecondary },
            ]}>
            {t.currentBalance}
          </Text>
          <Text
            style={[
              styles.balanceAmount,
              isLight && { color: theme.primary },
            ]}>
            ${currentBalance.toLocaleString()}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View
            style={[
              styles.statCard,
              styles.incomeCard,
              isLight && {
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                borderColor: 'rgba(16, 185, 129, 0.35)',
              },
            ]}>
            <View
              style={[
                styles.statIconContainer,
                isLight && { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
              ]}>
              <ArrowUpRight size={20} color="#10b981" strokeWidth={2.5} />
            </View>
            <View style={[styles.statContent, { marginLeft: 12 }]}>
              <Text
                style={[
                  styles.statLabel,
                  isLight && { color: theme.textSecondary },
                ]}>
                {t.income}
              </Text>
              <Text
                style={[
                  styles.statValue,
                  isLight && { color: theme.text },
                ]}>
                ${monthData.income.toLocaleString()}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statCard,
              styles.expenseCard,
              isLight && {
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.35)',
              },
            ]}>
            <View
              style={[
                styles.statIconContainer,
                isLight && { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
              ]}>
              <ArrowDownRight size={20} color="#ef4444" strokeWidth={2.5} />
            </View>
            <View style={[styles.statContent, { marginLeft: 12 }]}>
              <Text
                style={[
                  styles.statLabel,
                  isLight && { color: theme.textSecondary },
                ]}>
                {t.expense}
              </Text>
              <Text
                style={[
                  styles.statValue,
                  isLight && { color: theme.text },
                ]}>
                ${monthData.expense.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  balanceHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginHorizontal: 6,
  },
  incomeCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  expenseCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
