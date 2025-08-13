"use client";

import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BarChart } from "react-native-chart-kit";
import {
  ArrowLeft,
  ShoppingCart,
  Home,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react-native";
import { supabase } from "~/lib/supabase";

const { width } = Dimensions.get("window");

type Timeframe = "daily" | "weekly" | "monthly" | "yearly";

type ExpenseBreakdown = { food: number; nonFood: number; rent: number };

type Scenario = {
  id: "current" | "previous";
  name: string; // e.g., "This Month"
  total: number;
  breakdown: ExpenseBreakdown;
  trend?: "up" | "down" | "stable";
  trendPercentage?: number;
};

type ExpenseRow = {
  amount: number;
  category: string | null;
  date: string; // "YYYY-MM-DD"
};

// ——— helpers ———
const fmtMoney = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Math.round(v * 100) / 100
  );

function labelFor(tf: Timeframe, which: "current" | "previous") {
  const map: Record<Timeframe, [string, string]> = {
    daily: ["Today", "Yesterday"],
    weekly: ["This Week", "Last Week"],
    monthly: ["This Month", "Last Month"],
    yearly: ["This Year", "Last Year"],
  };
  const pair = map[tf];
  return which === "current" ? pair[0] : pair[1];
}

function getRanges(tf: Timeframe) {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let start: Date;
  let prevStart: Date;
  let prevEnd: Date;

  if (tf === "daily") {
    start = new Date(end);
    prevStart = new Date(end);
    prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(prevStart);
  } else if (tf === "weekly") {
    start = new Date(end);
    start.setDate(end.getDate() - 6);
    prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);
  } else if (tf === "monthly") {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
    const prevMonthEnd = new Date(start);
    prevMonthEnd.setDate(0);
    prevStart = new Date(
      prevMonthEnd.getFullYear(),
      prevMonthEnd.getMonth(),
      1
    );
    prevEnd = prevMonthEnd;
  } else {
    start = new Date(end.getFullYear(), 0, 1);
    prevStart = new Date(end.getFullYear() - 1, 0, 1);
    prevEnd = new Date(end.getFullYear() - 1, 11, 31);
  }

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  return {
    currentStart: fmt(start),
    currentEnd: fmt(end),
    previousStart: fmt(prevStart),
    previousEnd: fmt(prevEnd),
  };
}

function toBreakdown(rows: ExpenseRow[]): ExpenseBreakdown {
  let food = 0,
    rent = 0,
    nonFood = 0;

  for (const r of rows) {
    const cat = (r.category || "other").toLowerCase().trim();
    if (cat === "food") food += r.amount || 0;
    else if (cat === "rent" || cat === "house rent" || cat === "housing")
      rent += r.amount || 0;
    else nonFood += r.amount || 0;
  }
  return { food, nonFood, rent };
}

export default function CompareExpensesScreen() {
  const router = useRouter();
  const [tf, setTf] = useState<Timeframe>("monthly");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [current, setCurrent] = useState<ExpenseBreakdown>({
    food: 0,
    nonFood: 0,
    rent: 0,
  });
  const [previous, setPrevious] = useState<ExpenseBreakdown>({
    food: 0,
    nonFood: 0,
    rent: 0,
  });

  async function load() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error("Not signed in.");

      const { currentStart, currentEnd, previousStart, previousEnd } =
        getRanges(tf);

      const { data: curr, error: currErr } = await supabase
        .from("expenses")
        .select("amount, category, date")
        .eq("user_id", user.id)
        .gte("date", currentStart)
        .lte("date", currentEnd);

      if (currErr) throw currErr;

      const { data: prev, error: prevErr } = await supabase
        .from("expenses")
        .select("amount, category, date")
        .eq("user_id", user.id)
        .gte("date", previousStart)
        .lte("date", previousEnd);

      if (prevErr) throw prevErr;

      setCurrent(toBreakdown((curr as ExpenseRow[]) || []));
      setPrevious(toBreakdown((prev as ExpenseRow[]) || []));
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || "Failed to load expenses.");
      Alert.alert("Error", "Could not load your expenses. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tf]);

  const sum = (b: ExpenseBreakdown) => b.food + b.nonFood + b.rent;

  const scenarios: Scenario[] = useMemo(() => {
    const currTotal = sum(current);
    const prevTotal = sum(previous);
    const delta = currTotal - prevTotal;
    const pct = prevTotal > 0 ? Math.abs((delta / prevTotal) * 100) : 0;
    const trend =
      prevTotal === 0 || pct < 0.1 ? "stable" : delta > 0 ? "up" : "down";

    return [
      {
        id: "current",
        name: labelFor(tf, "current"),
        total: currTotal,
        breakdown: current,
        trend,
        trendPercentage: Number(pct.toFixed(1)),
      },
      {
        id: "previous",
        name: labelFor(tf, "previous"),
        total: prevTotal,
        breakdown: previous,
      },
    ];
  }, [current, previous, tf]);

  const chartData = useMemo(
    () => ({
      labels: ["Food", "Non-food", "Rent"],
      datasets: [
        {
          data: [
            scenarios[0].breakdown.food,
            scenarios[0].breakdown.nonFood,
            scenarios[0].breakdown.rent,
          ],
          color: (o = 1) => `rgba(16,185,129,${o})`, // emerald
        },
        {
          data: [
            scenarios[1].breakdown.food,
            scenarios[1].breakdown.nonFood,
            scenarios[1].breakdown.rent,
          ],
          color: (o = 1) => `rgba(59,130,246,${o})`, // blue
        },
      ],
      legend: [scenarios[0].name, scenarios[1].name],
    }),
    [scenarios]
  );

  const chartConfig = {
    backgroundColor: "#0f172a",
    backgroundGradientFrom: "#0f172a",
    backgroundGradientTo: "#0f172a",
    decimalPlaces: 0,
    color: (o = 1) => `rgba(248,250,252,${o})`,
    labelColor: (o = 1) => `rgba(148,163,184,${o})`,
    style: { borderRadius: 16 },
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: "#334155",
      strokeWidth: 1,
    },
  };

  const delta = scenarios[0].total - scenarios[1].total;
  const deltaIsUp = delta > 0;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" />
        <Text className="mt-3 text-slate-300">Loading your comparison…</Text>
      </SafeAreaView>
    );
  }

  const noData = sum(current) === 0 && sum(previous) === 0 && !errorMsg;

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-800">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Compare Expenses</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Timeframe chips */}
      <View className="px-6 py-3">
        <View className="flex-row gap-2">
          {(["daily", "weekly", "monthly", "yearly"] as Timeframe[]).map(
            (key) => {
              const selected = tf === key;
              const label = labelFor(key, "current");
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setTf(key)}
                  className={`px-3 py-2 rounded-full border ${
                    selected
                      ? "bg-emerald-500 border-emerald-500"
                      : "bg-slate-800 border-slate-700"
                  }`}
                >
                  <Text
                    className={selected ? "text-white" : "text-slate-300"}
                    style={{ fontWeight: selected ? "700" : "500" }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>
        <View className="flex-row items-center mt-2">
          <Info size={14} color="#94a3b8" />
          <Text className="text-slate-400 text-xs ml-2">
            You’re comparing {labelFor(tf, "current")} to{" "}
            {labelFor(tf, "previous")}.
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {noData ? (
          /* Empty state */
          <View className="px-6 py-14 items-center">
            <Text className="text-white text-lg font-semibold mb-2">
              No expenses yet
            </Text>
            <Text className="text-slate-400 text-center">
              Add an expense first, then come back to see the comparison.
            </Text>
          </View>
        ) : (
          <>
            {/* Totals at a glance */}
            <View className="px-6 mt-4 mb-2">
              <View className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-slate-400 text-xs">
                      {labelFor(tf, "current")}
                    </Text>
                    <Text className="text-white text-2xl font-bold">
                      {fmtMoney(scenarios[0].total)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text className="text-slate-400 text-xs">
                      {labelFor(tf, "previous")}
                    </Text>
                    <Text className="text-white text-2xl font-bold">
                      {fmtMoney(scenarios[1].total)}
                    </Text>
                  </View>
                </View>

                <View className="h-[1px] bg-slate-700 my-12" />

                <View className="flex-row items-center justify-between">
                  <Text className="text-slate-300">Change</Text>
                  <View className="flex-row items-center">
                    {deltaIsUp ? (
                      <TrendingUp size={16} color="#ef4444" />
                    ) : (
                      <TrendingDown size={16} color="#10b981" />
                    )}
                    <Text
                      className={`text-lg font-semibold ml-2 ${
                        deltaIsUp ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {deltaIsUp ? "+" : "-"}
                      {fmtMoney(Math.abs(delta))}
                    </Text>
                  </View>
                </View>
                <Text className="text-slate-400 text-xs mt-2">
                  {deltaIsUp ? "You spent more." : "You spent less."} That’s{" "}
                  {scenarios[0].trendPercentage?.toFixed(1)}% compared with{" "}
                  {labelFor(tf, "previous").toLowerCase()}.
                </Text>
              </View>
            </View>

            {/* Category Comparison */}
            <View className="px-6 my-6">
              <View className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                <Text className="text-white font-bold text-lg mb-2">
                  By Category
                </Text>
                <Text className="text-slate-400 text-xs mb-4">
                  Green = {labelFor(tf, "current")}, Blue ={" "}
                  {labelFor(tf, "previous")}
                </Text>
                <BarChart
                  data={chartData}
                  width={width - 48}
                  height={220}
                  chartConfig={chartConfig}
                  verticalLabelRotation={0}
                  showValuesOnTopOfBars
                  fromZero
                />
                <View className="mt-6 gap-3">
                  <Row
                    label="Food"
                    left={fmtMoney(scenarios[0].breakdown.food)}
                    right={fmtMoney(scenarios[1].breakdown.food)}
                  >
                    <ShoppingCart size={14} color="#10b981" />
                  </Row>
                  <Row
                    label="Non-food"
                    left={fmtMoney(scenarios[0].breakdown.nonFood)}
                    right={fmtMoney(scenarios[1].breakdown.nonFood)}
                  >
                    <MoreHorizontal size={14} color="#8b5cf6" />
                  </Row>
                  <Row
                    label="Rent"
                    left={fmtMoney(scenarios[0].breakdown.rent)}
                    right={fmtMoney(scenarios[1].breakdown.rent)}
                  >
                    <Home size={14} color="#f59e0b" />
                  </Row>
                </View>
              </View>
            </View>

            {/* Plain-English tips */}
            <View className="px-6 mb-10">
              <View className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                <Text className="text-white font-bold text-lg mb-3">
                  What this means
                </Text>
                <Tip>
                  Food changed by{" "}
                  {fmtMoney(
                    scenarios[0].breakdown.food - scenarios[1].breakdown.food
                  )}
                  .
                </Tip>
                <Tip>
                  Non-food changed by{" "}
                  {fmtMoney(
                    scenarios[0].breakdown.nonFood -
                      scenarios[1].breakdown.nonFood
                  )}
                  .
                </Tip>
                <Tip>
                  Rent changed by{" "}
                  {fmtMoney(
                    scenarios[0].breakdown.rent - scenarios[1].breakdown.rent
                  )}
                  .
                </Tip>
                <Text className="text-slate-400 text-xs mt-3">
                  Tip: Tap a different chip above to compare another period.
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* —— small UI helpers —— */

function Row({
  label,
  left,
  right,
  children,
}: {
  label: string;
  left: string;
  right: string;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center">
        <View className="w-6 h-6 rounded-full bg-slate-700/60 justify-center items-center mr-2">
          {children}
        </View>
        <Text className="text-slate-300">{label}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text className="text-emerald-400 text-xs">{left}</Text>
        <Text className="text-blue-400 text-xs">{right}</Text>
      </View>
    </View>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row">
      <Text className="text-slate-300 flex-1">{children}</Text>
    </View>
  );
}
