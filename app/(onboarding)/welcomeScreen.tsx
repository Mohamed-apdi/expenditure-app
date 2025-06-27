import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { PieChart, Users, TrendingUp, Shield, Zap, ArrowRight } from "lucide-react-native";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <>
    <Stack.Screen options={{ headerShown: false }} />
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-1 px-6 justify-between py-10">
        <View className="flex-row items-center justify-center gap-1.5">
            <View className="w-6 h-2 bg-emerald-400 rounded-full" />
            <View className="w-2 h-2 bg-white/30 rounded-full" />
            <View className="w-2 h-2 bg-white/30 rounded-full" />
        </View>
        {/* Hero Illustration */}
        <View className="items-center mt-10">
          <View className="w-48 h-48 bg-slate-800 rounded-full justify-center items-center border-2 border-emerald-500 relative">
            <PieChart size={80} color="#10b981" />
            <View className="absolute bottom-5 right-5 bg-slate-700 rounded-xl p-2">
              <Users size={40} color="#64748b" />
            </View>
          </View>
        </View>

        {/* Title and Tagline */}
        <View className="items-center px-5">
          <Text className="text-white text-3xl font-bold text-center mb-4">
            Household Expenditure Predictor
          </Text>
          <Text className="text-emerald-500 text-lg text-center font-semibold mb-3">
            Take control of household spending with AI-powered predictions
          </Text>
          <Text className="text-slate-400 text-base text-center leading-6">
            Get accurate forecasts based on your family's spending patterns
          </Text>
        </View>

        {/* Features */}
        <View className="flex-row justify-around px-5">
          <View className="items-center flex-1">
            <TrendingUp size={24} color="#10b981" />
            <Text className="text-slate-200 text-sm mt-2 text-center font-medium">
              Smart Predictions
            </Text>
          </View>
          <View className="items-center flex-1">
            <Shield size={24} color="#10b981" />
            <Text className="text-slate-200 text-sm mt-2 text-center font-medium">
              Secure & Private
            </Text>
          </View>
          <View className="items-center flex-1">
            <Zap size={24} color="#10b981" />
            <Text className="text-slate-200 text-sm mt-2 text-center font-medium">
              Real-time Insights
            </Text>
          </View>
        </View>

        {/* Get Started Button */}
        <TouchableOpacity
          className="bg-emerald-500 py-4 px-8 rounded-xl flex-row items-center justify-center mx-5 shadow-lg shadow-emerald-500/30"
          onPress={() => router.push("/inputCategoriesScreen" as never)}
        >
          <Text className="text-white text-lg font-bold mr-2">Get Started</Text>
          <ArrowRight size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </>
  );
}