import { View, Text } from "react-native";

interface TransactionItemProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  description: string;
  category: string;
  time: string;
  amount: number;
  color: string;
}

export default function TransactionItem({
  icon: Icon,
  description,
  category,
  time,
  amount,
  color,
}: TransactionItemProps) {
  return (
    <View className="flex-row items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
      <View
        className="w-10 h-10 rounded-full justify-center items-center mr-3"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={20} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-white font-medium">{description}</Text>
        <Text className="text-slate-400 text-xs">
          {category} • {time}
        </Text>
      </View>
      <Text className="text-rose-500 font-bold">-${amount}</Text>
    </View>
  );
}