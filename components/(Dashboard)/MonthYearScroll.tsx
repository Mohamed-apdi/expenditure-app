/**
 * Horizontal month/year picker and income/expense summary for dashboard
 */
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  LayoutChangeEvent,
  InteractionManager,
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

// Fixed pill width (minWidth: 88 + marginHorizontal: 4*2 + paddingHorizontal: 14*2 approximated)
const PILL_WIDTH = 96;
const PILL_MARGIN = 8;
const CONTENT_PADDING = 12;

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
  /** When provided, month data is only fetched after userId is set (avoids showing 0s before auth is ready). */
  userId?: string | null;
};

type ItemLayout = { x: number; width: number };

export default function MonthYearScroller({
  variant = 'dark',
  onMonthChange,
  fetchMonthData,
  refreshTrigger = 0,
  userId,
}: MonthYearScrollerProps) {
  const current = new Date();
  const currentYear = current.getFullYear();
  const currentMonth = current.getMonth();
  const currentLabel = `${months[currentMonth]} ${currentYear}`;

  const { t } = useLanguage();
  const theme = useTheme();
  const { selectedAccount } = useAccount();
  const isLight = variant === 'light';

  const [monthData, setMonthData] = useState<{
    income: number;
    expense: number;
    balance: number;
  }>({ income: 0, expense: 0, balance: 0 });

  const currentBalance = useMemo(() => {
    return selectedAccount?.amount || 0;
  }, [selectedAccount]);

  // Generate list from 2025 → current month/year
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

  // Get index of current month in the data array
  const currentMonthIndex = useMemo(() => {
    return data.indexOf(currentLabel);
  }, [data, currentLabel]);

  const [selected, setSelected] = useState<string>(currentLabel);

  // ---- Scroll refs and state ----
  const scrollRef = useRef<ScrollView>(null);
  const containerWidthRef = useRef<number>(0);
  const itemLayoutsRef = useRef<Record<string, ItemLayout>>({});
  const hasInitiallyCenteredRef = useRef(false);
  const prevRefreshTriggerRef = useRef(refreshTrigger);

  // Calculate estimated initial offset based on index (for immediate positioning)
  const estimatedInitialOffset = useMemo(() => {
    const itemTotalWidth = PILL_WIDTH + PILL_MARGIN;
    return Math.max(0, CONTENT_PADDING + currentMonthIndex * itemTotalWidth - 150);
  }, [currentMonthIndex]);

  // Helper to scroll to any item by label using measured layouts
  const scrollToItem = useCallback((label: string, animated = true) => {
    const containerWidth = containerWidthRef.current;
    const layout = itemLayoutsRef.current[label];
    if (!scrollRef.current || !containerWidth || !layout) return;
    const targetX = Math.max(0, layout.x + layout.width / 2 - containerWidth / 2);
    scrollRef.current.scrollTo({ x: targetX, animated });
  }, []);

  // Attempt to center selected item using accurate measurements
  const attemptInitialCenter = useCallback(() => {
    if (hasInitiallyCenteredRef.current) return;
    const containerWidth = containerWidthRef.current;
    const layout = itemLayoutsRef.current[selected];
    if (containerWidth > 0 && layout) {
      hasInitiallyCenteredRef.current = true;
      scrollToItem(selected, false);
    }
  }, [selected, scrollToItem]);

  const onContainerLayout = (e: LayoutChangeEvent) => {
    containerWidthRef.current = e.nativeEvent.layout.width;
    attemptInitialCenter();
  };

  const onItemLayout = (item: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    itemLayoutsRef.current[item] = { x, width };

    // When selected item is measured, try to center with accurate position
    if (item === selected) {
      attemptInitialCenter();
    }
  };

  // On mount: use InteractionManager to scroll after animations complete
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      if (!hasInitiallyCenteredRef.current) {
        attemptInitialCenter();
      }
    });

    // Also set up fallback timeouts
    const timeouts = [100, 250, 500].map((delay) =>
      setTimeout(() => {
        if (!hasInitiallyCenteredRef.current) {
          attemptInitialCenter();
        }
      }, delay)
    );

    return () => {
      task.cancel();
      timeouts.forEach(clearTimeout);
    };
  }, [attemptInitialCenter]);

  // When user taps a different month, center it with animation
  const prevSelectedRef = useRef(selected);
  useEffect(() => {
    // Only animate if selected actually changed (not on mount)
    if (prevSelectedRef.current !== selected && hasInitiallyCenteredRef.current) {
      scrollToItem(selected, true);
    }
    prevSelectedRef.current = selected;
  }, [selected, scrollToItem]);

  // Reset to current month on refreshTrigger change (skip initial mount)
  useEffect(() => {
    // Skip initial mount
    if (prevRefreshTriggerRef.current === refreshTrigger) return;
    prevRefreshTriggerRef.current = refreshTrigger;

    setSelected(currentLabel);
    hasInitiallyCenteredRef.current = false;
    
    // Use InteractionManager + fallback timeouts
    const task = InteractionManager.runAfterInteractions(() => {
      scrollToItem(currentLabel, false);
      hasInitiallyCenteredRef.current = true;
    });

    const timeouts = [50, 150].map((delay) =>
      setTimeout(() => {
        if (!hasInitiallyCenteredRef.current) {
          scrollToItem(currentLabel, false);
          if (containerWidthRef.current > 0 && itemLayoutsRef.current[currentLabel]) {
            hasInitiallyCenteredRef.current = true;
          }
        }
      }, delay)
    );

    return () => {
      task.cancel();
      timeouts.forEach(clearTimeout);
    };
  }, [refreshTrigger, currentLabel, scrollToItem]);

  // ---- Fetch month data when selected changes (and when userId is ready so we don't show 0s) ----
  useEffect(() => {
    const [monthStr, yearStr] = selected.split(' ');
    const monthIndex = months.indexOf(monthStr);
    const year = parseInt(yearStr, 10);

    const loadMonthData = async () => {
      try {
        const res = await fetchMonthData(monthIndex, year);
        setMonthData(res);
        onMonthChange(monthIndex, year);
      } catch (error) {
        console.error('Error loading month data:', error);
      }
    };

    // If userId is passed, wait until it's set so we don't show 0s before auth/store is ready
    const canFetch = monthIndex >= 0 && year > 0 && (userId === undefined || userId !== null);
    if (canFetch) {
      loadMonthData();
    }
  }, [selected, refreshTrigger, selectedAccount?.id, fetchMonthData, onMonthChange, userId]);

  return (
    <View className="py-4">
      {/* Month scroller */}
      <View style={styles.monthScrollerWrap} onLayout={onContainerLayout}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthScrollerContent}
          style={styles.monthScrollerList}
          contentOffset={{ x: estimatedInitialOffset, y: 0 }}
        >
          {data.map((item) => {
            const isActive = item === selected;

            const pillBg = isActive
              ? isLight
                ? '#00BFFF'
                : '#FFFFFF'
              : 'transparent';

            const pillText = isActive
              ? '#FFFFFF'
              : isLight
                ? theme.textSecondary
                : 'rgba(255,255,255,0.9)';

            return (
              <TouchableOpacity
                key={item}
                onPress={() => setSelected(item)}
                onLayout={onItemLayout(item)}
                activeOpacity={0.8}
                style={[
                  styles.monthPill,
                  { 
                    backgroundColor: pillBg,
                    opacity: 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.monthPillText,
                    {
                      fontWeight: isActive ? '700' : '500',
                      color: pillText,
                    },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
        ]}
      >
        <View style={styles.balanceHeader}>
          <Text
            style={[
              styles.balanceLabel,
              isLight && { color: theme.textSecondary },
            ]}
          >
            {t.currentBalance}
          </Text>

          <Text
            style={[
              styles.balanceAmount,
              isLight && { color: theme.primary },
            ]}
          >
            ${currentBalance.toLocaleString()}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          {/* Income */}
          <View
            style={[
              styles.statCard,
              styles.incomeCard,
              isLight && {
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                borderColor: 'rgba(16, 185, 129, 0.35)',
              },
            ]}
          >
            <View
              style={[
                styles.statIconContainer,
                isLight && { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
              ]}
            >
              <ArrowUpRight size={20} color="#10b981" strokeWidth={2.5} />
            </View>

            <View style={[styles.statContent, { marginLeft: 12 }]}>
              <Text
                style={[
                  styles.statLabel,
                  isLight && { color: theme.textSecondary },
                ]}
              >
                {t.income}
              </Text>
              <Text style={[styles.statValue, isLight && { color: theme.text }]}>
                ${monthData.income.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Expense */}
          <View
            style={[
              styles.statCard,
              styles.expenseCard,
              isLight && {
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.35)',
              },
            ]}
          >
            <View
              style={[
                styles.statIconContainer,
                isLight && { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
              ]}
            >
              <ArrowDownRight size={20} color="#ef4444" strokeWidth={2.5} />
            </View>

            <View style={[styles.statContent, { marginLeft: 12 }]}>
              <Text
                style={[
                  styles.statLabel,
                  isLight && { color: theme.textSecondary },
                ]}
              >
                {t.expense}
              </Text>
              <Text style={[styles.statValue, isLight && { color: theme.text }]}>
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
  monthScrollerWrap: {
    minHeight: 44,
  },
  monthScrollerList: {
    minHeight: 44,
  },
  monthScrollerContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    paddingVertical: 4,
  },
  monthPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthPillText: {
    fontSize: 13,
  },

  balanceCard: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
