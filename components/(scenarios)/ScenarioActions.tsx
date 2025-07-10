import { TouchableOpacity, Text, View } from "react-native";
import { Edit3, Copy, Trash2 } from "lucide-react-native";

export default function ScenarioActions() {
  return (
    <View className="flex-row justify-around border-t border-slate-700 pt-4">
      <TouchableOpacity className="flex-row items-center px-3 py-2">
        <Edit3 size={16} color="#94a3b8" />
        <Text className="text-slate-400 text-xs ml-1.5">Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity className="flex-row items-center px-3 py-2">
        <Copy size={16} color="#94a3b8" />
        <Text className="text-slate-400 text-xs ml-1.5">Duplicate</Text>
      </TouchableOpacity>
      <TouchableOpacity className="flex-row items-center px-3 py-2">
        <Trash2 size={16} color="#ef4444" />
        <Text className="text-red-500 text-xs ml-1.5">Delete</Text>
      </TouchableOpacity>
    </View>
  );
}