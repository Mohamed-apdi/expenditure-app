// components/ComparisonResult.tsx
import { View, Text } from "react-native";

export default function ComparisonResult({ result }: { result: any }) {
  return (
    <View className="mt-8 bg-slate-800 rounded-xl p-5">
      <Text className="text-white text-xl font-bold mb-4">
        {result.message}
      </Text>
      
      <View className="flex-row justify-between mb-6">
        <View>
          <Text className="text-slate-400">Actual</Text>
          <Text className="text-white text-2xl font-bold">
            ${result.total_actual.toFixed(2)}
          </Text>
        </View>
        <View>
          <Text className="text-slate-400">Predicted</Text>
          <Text className="text-white text-2xl font-bold">
            ${result.total_predicted_monthly.toFixed(2)}
          </Text>
        </View>
        <View>
          <Text className="text-slate-400">Difference</Text>
          <Text 
            className={`text-2xl font-bold ${
              result.variance_percentage > 0 
                ? "text-red-500" 
                : "text-emerald-500"
            }`}
          >
            {result.variance_percentage > 0 ? "+" : ""}
            {result.variance_percentage.toFixed(2)}%
          </Text>
        </View>
      </View>

      <Text className="text-white font-bold mb-3">Category Breakdown:</Text>
      {result.category_breakdown.map((category: any) => (
        <View key={category.category} className="mb-4">
          <View className="flex-row justify-between mb-1">
            <Text className="text-white">{category.category}</Text>
            <Text className="text-white">
              ${category.actual.toFixed(2)} / ${category.predicted.toFixed(2)}
            </Text>
          </View>
          <View className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <View 
              className="h-full"
              style={{
                width: `${Math.min(100, Math.abs(category.percentage_diff))}%`,
                backgroundColor: category.percentage_diff > 0 
                  ? "#ef4444" 
                  : "#10b981",
              }}
            />
          </View>
          <Text 
            className={`text-xs mt-1 ${
              category.percentage_diff > 0 ? "text-red-500" : "text-emerald-500"
            }`}
          >
            {category.percentage_diff > 0 ? "+" : ""}
            {category.percentage_diff.toFixed(2)}%
          </Text>
        </View>
      ))}
    </View>
  );
}