import { useMemo, useState, useEffect, useRef } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { ArrowUpRight, ArrowDownRight } from "lucide-react-native";
import { useLanguage } from "~/lib";
import { useAccount } from "~/lib";

const months = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

type MonthYearScrollerProps = {
  onMonthChange: (
    month: number,
    year: number
  ) => Promise<{
    income: number;
    expense: number;
    balance: number;
  }>;
  monthData?: {
    income: number;
    expense: number;
    balance: number;
  };
};

export default function MonthYearScroller({
  onMonthChange,
  monthData = { income: 0, expense: 0, balance: 0 },
}: MonthYearScrollerProps) {
  const current = new Date();
  const currentYear = current.getFullYear();
  const currentMonth = current.getMonth();
  const { t } = useLanguage();
  const { selectedAccount } = useAccount();

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
    `${months[currentMonth]} ${currentYear}`
  );

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
    const [monthStr, yearStr] = selected.split(" ");
    const monthIndex = months.indexOf(monthStr);
    const year = parseInt(yearStr);

    // Only call onMonthChange if we have valid month/year values
    if (monthIndex >= 0 && year > 0) {
      onMonthChange(monthIndex, year);
    }
  }, [selected, onMonthChange]);

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
        renderItem={({ item }) => {
          const isActive = item === selected;
          return (
            <TouchableOpacity
              onPress={() => setSelected(item)}
              className={`px-4 py-2 mx-1 rounded-full ${
                isActive ? "bg-[#ffffff]" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-sm ${
                  isActive ? "text-[#3b82f6] font-bold" : "text-white"
                }`}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Balance Card */}
      <View className="px-6 mt-6">
        <View className="rounded-2xl">
          <Text className="text-white/80 text-xs text-center mb-1">
            {selectedAccount
              ? `${selectedAccount.name} - ${t.currentBalance}`
              : t.currentBalance}
          </Text>
          <Text className="text-white text-3xl font-extrabold text-center mb-6">
            $
            {selectedAccount
              ? selectedAccount.amount?.toFixed(0)
              : monthData.balance.toLocaleString()}
          </Text>

          <View className="flex-row justify-between px-3">
            {/* Incomes */}
            <View className="flex-row items-center gap-2">
              <ArrowUpRight size={18} color="limegreen" />
              <View>
                <Text className="text-xs text-white/70">{t.income}</Text>
                <Text className="text-white font-bold">
                  ${monthData.income.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Expenses */}
            <View className="flex-row items-center gap-2">
              <ArrowDownRight size={18} color="tomato" />
              <View>
                <Text className="text-xs text-white/70">{t.expense}</Text>
                <Text className="text-white font-bold">
                  -${monthData.expense.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
