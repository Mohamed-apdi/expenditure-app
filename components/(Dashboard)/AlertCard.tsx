import { View, Text } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "~/lib/theme";

interface AlertCardProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  message: string;
  color: string;
}

export default function AlertCard({
  icon: Icon,
  message,
  color,
}: AlertCardProps) {
  const theme = useTheme();

  return (
    <View
      className="flex-row items-center  p-4 rounded-xl border "
      style={{
        backgroundColor: theme.cardBackground,
        borderColor: theme.border,
      }}
    >
      <Icon size={20} color={color} />
      <Text className=" flex-1 ml-3" style={{ color: theme.text }}>
        {message}
      </Text>
      <ChevronRight size={16} color="#64748b" />
    </View>
  );
}
