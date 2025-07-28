import { View, Text, TouchableOpacity } from "react-native"

export const DataTypeSelector = ({ selectedDataType, setSelectedDataType }) => (
  <View className="flex-row px-6 py-4 gap-2">
    <TouchableOpacity
      className={`flex-1 py-3 px-4 rounded-xl border ${
        selectedDataType === "expenses" ? "bg-emerald-500 border-emerald-500" : "bg-slate-800 border-slate-700"
      }`}
      onPress={() => setSelectedDataType("expenses")}
    >
      <Text className={`text-center font-semibold ${selectedDataType === "expenses" ? "text-white" : "text-slate-300"}`}>
        Expenses Analysis
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      className={`flex-1 py-3 px-4 rounded-xl border ${
        selectedDataType === "predictions" ? "bg-blue-500 border-blue-500" : "bg-slate-800 border-slate-700"
      }`}
      onPress={() => setSelectedDataType("predictions")}
    >
      <Text className={`text-center font-semibold ${selectedDataType === "predictions" ? "text-white" : "text-slate-300"}`}>
        Predictions Analysis
      </Text>
    </TouchableOpacity>
  </View>
)