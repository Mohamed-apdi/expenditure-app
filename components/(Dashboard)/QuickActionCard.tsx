import { TouchableOpacity, Text, View } from "react-native";

interface QuickActionCardProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  title: string;
  color: string;
  onPress: () => void;
}

export default function QuickActionCard({ 
  icon: Icon, 
  title, 
  color, 
  onPress 
}: QuickActionCardProps) {
  return (
    <TouchableOpacity
      className="bg-slate-800 p-4 rounded-xl border border-slate-700 items-center flex-1 min-w-[45%]"
      onPress={onPress}
    >
      <View
        className="w-12 h-12 rounded-full justify-center items-center mb-2"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={24} color={color} />
      </View>
      <Text className="text-white font-medium text-center">{title}</Text>
    </TouchableOpacity>
  );
}