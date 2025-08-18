import { useMemo, useState, useEffect } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { ArrowUpRight, ArrowDownRight } from "lucide-react-native";

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
  onMonthChange: (month: number, year: number) => void;
  fetchMonthData: (
    month: number,
    year: number
  ) => Promise<{
    income: number;
    expense: number;
    balance: number;
  }>;
};

export default function MonthYearScroller({
  onMonthChange,
  fetchMonthData,
}: MonthYearScrollerProps) {
  const current = new Date();
  const currentYear = current.getFullYear();
  const currentMonth = current.getMonth();

  const [monthData, setMonthData] = useState<{
    income: number;
    expense: number;
    balance: number;
  }>({ income: 0, expense: 0, balance: 0 });

  // Generate month/year list from 2024 → current year
  const data = useMemo(() => {
    const arr: string[] = [];
    for (let y = 2024; y <= currentYear; y++) {
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

  useEffect(() => {
    // Parse the selected month/year
    const [monthStr, yearStr] = selected.split(" ");
    const monthIndex = months.indexOf(monthStr);
    const year = parseInt(yearStr);

    // Fetch data for the selected month
    const loadMonthData = async () => {
      const data = await fetchMonthData(monthIndex, year);
      setMonthData(data);
      onMonthChange(monthIndex, year);
    };

    loadMonthData();
  }, [selected, fetchMonthData, onMonthChange]);

  return (
    <View className="py-4">
      {/* Month scroller */}
      <FlatList
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
            CURRENT BALANCE
          </Text>
          <Text className="text-white text-3xl font-extrabold text-center mb-6">
            ${monthData.balance.toLocaleString()}
          </Text>

          <View className="flex-row justify-between px-3">
            {/* Incomes */}
            <View className="flex-row items-center gap-2">
              <ArrowUpRight size={18} color="limegreen" />
              <View>
                <Text className="text-xs text-white/70">INCOMES</Text>
                <Text className="text-white font-bold">
                  ${monthData.income.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Expenses */}
            <View className="flex-row items-center gap-2">
              <ArrowDownRight size={18} color="tomato" />
              <View>
                <Text className="text-xs text-white/70">EXPENSES</Text>
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
