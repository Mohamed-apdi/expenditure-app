import { View, Text, TouchableOpacity} from "react-native"
import Icon from "react-native-vector-icons/Feather"

export const AnalyticsHeader = ({ navigation }) => (
  <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <Icon name="arrow-left" size={24} color="#f8fafc" />
    </TouchableOpacity>
    <Text className="text-white text-lg font-bold">Advanced Analytics</Text>
    <TouchableOpacity>
      <Icon name="settings" size={20} color="#94a3b8" />
    </TouchableOpacity>
  </View>
)