import { View, Text } from "react-native";
import { ChevronRight } from "lucide-react-native";

interface AlertCardProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  message: string;
  color: string;
}

export default function AlertCard({ icon: Icon, message, color }: AlertCardProps) {
  return (
    <View className="flex-row items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
      <Icon size={20} color={color} />
      <Text className="text-white flex-1 ml-3">{message}</Text>
      <ChevronRight size={16} color="#64748b" />
    </View>
  );
}