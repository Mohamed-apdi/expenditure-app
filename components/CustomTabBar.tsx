import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Home, BarChart2, Wallet, Plus } from "lucide-react-native";
import { useRouter } from "expo-router";

export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Home */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.push("/(main)/Dashboard")}
      >
        <Home size={24} color={state.index === 0 ? "#10b981" : "#64748b"} />
        <Text style={[styles.label, state.index === 0 && styles.active]}>
          Home
        </Text>
      </TouchableOpacity>

      {/* Reports */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.push("/(main)/ReportsScreen")}
      >
        <BarChart2
          size={24}
          color={state.index === 1 ? "#10b981" : "#64748b"}
        />
        <Text style={[styles.label, state.index === 1 && styles.active]}>
          Reports
        </Text>
      </TouchableOpacity>

      {/* Middle Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/(expense)/AddExpense")}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>
      {/* Budget */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.push("/(main)/BudgetScreen")}
      >
        <Wallet size={24} color={state.index === 2 ? "#10b981" : "#64748b"} />
        <Text style={[styles.label, state.index === 2 && styles.active]}>
          Budgets
        </Text>
      </TouchableOpacity>

      {/* Accounts */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.push("/(main)/Accounts")}
      >
        <Wallet size={24} color={state.index === 3 ? "#10b981" : "#64748b"} />
        <Text style={[styles.label, state.index === 3 && styles.active]}>
          Accounts
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    height: 70,
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  active: {
    color: "#10b981",
    fontWeight: "500",
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40, // float effect
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 6,
  },
});
