import { View, Text, TouchableOpacity } from "react-native";
import { Bell } from "lucide-react-native";

interface DashboardHeaderProps {
  userName: string;
  notificationCount: number;
}

export default function DashboardHeader({ 
  userName, 
  notificationCount 
}: DashboardHeaderProps) {
  return (
    <View className="flex-row justify-between items-center px-6 py-5">
      <View>
        <Text className="text-white text-2xl font-bold">
          Good Morning! {userName}
        </Text>
        <Text className="text-slate-400 mt-1">
          Here's your spending overview
        </Text>
      </View>
      <TouchableOpacity className="relative">
        <Bell size={24} color="#f8fafc" />
        {notificationCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-rose-500 rounded-full w-5 h-5 justify-center items-center">
            <Text className="text-white text-xs font-bold">
              {notificationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}