import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Home, Users, TrendingUp, Info, ArrowRight } from "lucide-react-native";

const categories = [
  {
    id: "essentials",
    title: "Essentials",
    description: "Food, rent, and basic necessities",
    icon: Home,
    color: "#10b981",
    fields: ["exp_food", "exp_nfnd", "exp_rent", "pce"],
  },
  {
    id: "household",
    title: "Household Profile",
    description: "Family size, region, and utilities",
    icon: Users,
    color: "#3b82f6",
    fields: ["hhsize", "region_n", "hh_water_type", "hh_electricity"],
  },
  {
    id: "advanced",
    title: "Advanced Metrics",
    description: "Living conditions and economic factors",
    icon: TrendingUp,
    color: "#8b5cf6",
    fields: ["liv4_*", "shock10_*", "nfe16_*", "foodsec7_07"],
  },
];

export default function InputCategoriesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="flex-row items-center justify-center gap-1.5 pt-10">
            <View className="w-2 h-2 bg-white/30 rounded-full" />
            <View className="w-6 h-2 bg-emerald-400 rounded-full" />
            <View className="w-2 h-2 bg-white/30 rounded-full" />
        </View>
        <View className="px-6 py-5">
          <Text className="text-white text-2xl font-bold mb-2">Input Categories</Text>
          <Text className="text-slate-400 text-base leading-6">
            We'll collect information in these categories to make accurate predictions
          </Text>
        </View>

        <View className="px-6 gap-4 mb-6">
          {categories.map((category, index) => (
            <View
              key={category.id}
              className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex-row items-start relative"
            >
              <View
                className="w-14 h-14 rounded-lg justify-center items-center mr-4"
                style={{ backgroundColor: `${category.color}20` }}
              >
                <category.icon size={28} color={category.color} />
              </View>

              <View className="flex-1">
                <Text className="text-white text-lg font-bold mb-1">{category.title}</Text>
                <Text className="text-slate-400 text-sm mb-3 leading-5">{category.description}</Text>

                <View>
                  <Text className="text-slate-500 text-xs font-medium mb-1">Includes:</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {category.fields.slice(0, 3).map((field, idx) => (
                      <View key={idx} className="bg-slate-700 px-2 py-1 rounded">
                        <Text className="text-slate-200 text-xs font-medium">{field}</Text>
                      </View>
                    ))}
                    {category.fields.length > 3 && (
                      <View className="bg-slate-700 px-2 py-1 rounded">
                        <Text className="text-slate-200 text-xs font-medium">
                          +{category.fields.length - 3}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View className="absolute top-4 right-4 w-6 h-6 bg-emerald-500 rounded-full justify-center items-center">
                <Text className="text-white text-xs font-bold">{index + 1}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* <View className="mx-6 mb-6 bg-slate-800 border border-blue-500 rounded-xl p-4 flex-row">
          <Info size={20} color="#3b82f6" />
          <Text className="text-slate-400 text-sm ml-3 flex-1 leading-5">
            All data is processed locally and securely. Your privacy is our priority.
          </Text>
        </View> */}

        <TouchableOpacity
          className="mx-6 mb-6 bg-emerald-500 py-4 rounded-xl flex-row items-center justify-center"
          onPress={() => router.push("/AuthGateScreen" as never)}
        >
          <Text className="text-white text-base font-bold mr-2">Continue</Text>
          <ArrowRight size={20} color="#ffffff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}