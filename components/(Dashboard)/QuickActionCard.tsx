import { TouchableOpacity, Text, View } from "react-native";
import { useTheme } from "~/lib/theme";
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
  onPress,
}: QuickActionCardProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      className="p-4 rounded-xl border items-center flex-1 min-w-[45%]"
      style={{
        backgroundColor: theme.cardBackground,
        borderColor: theme.border,
      }}
      onPress={onPress}
    >
      <View
        className="w-12 h-12 rounded-full justify-center items-center mb-2"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={24} color={color} />
      </View>
      <Text className="font-medium text-center" style={{ color: theme.text }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
