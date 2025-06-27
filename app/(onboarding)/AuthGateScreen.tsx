import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ShieldCheck, Save, RefreshCw, TrendingUp, Mail, Smartphone } from "lucide-react-native";

export default function AuthGateScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-1 px-6 justify-between py-5">
        {/* Header */}
        <View className="items-center pt-10">
          <View className="w-20 h-20 bg-emerald-500/20 rounded-full justify-center items-center mb-6">
            <ShieldCheck size={48} color="#10b981" />
          </View>
          <Text className="text-white text-2xl font-bold text-center mb-3">Secure Your Data</Text>
          <Text className="text-slate-400 text-base text-center leading-6 px-5">
            Create an account to save your predictions and access advanced features
          </Text>
        </View>

        {/* Benefits */}
        <View className="py-5">
          <View className="flex-row items-center py-3">
            <Save size={20} color="#10b981" />
            <Text className="text-slate-200 text-base ml-4 font-medium">Save predictions & scenarios</Text>
          </View>
          <View className="flex-row items-center py-3">
            <RefreshCw size={20} color="#10b981" />
            <Text className="text-slate-200 text-base ml-4 font-medium">Sync across devices</Text>
          </View>
          <View className="flex-row items-center py-3">
            <TrendingUp size={20} color="#10b981" />
            <Text className="text-slate-200 text-base ml-4 font-medium">Track spending trends</Text>
          </View>
        </View>

        {/* Auth Buttons */}
        <View className="gap-3">
          {/* Google Button */}
          <TouchableOpacity className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl p-4">
            <View className="w-8 h-8 bg-blue-500 rounded-full justify-center items-center mr-4">
              <Text className="text-white font-bold">G</Text>
            </View>
            <Text className="text-white font-medium flex-1">Continue with Google</Text>
          </TouchableOpacity>

          {/* Apple Button */}
          <TouchableOpacity className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl p-4">
            <View className="w-8 h-8 bg-black rounded-full justify-center items-center mr-4">
              <Smartphone size={16} color="#ffffff" />
            </View>
            <Text className="text-white font-medium flex-1">Continue with Apple</Text>
          </TouchableOpacity>

          {/* Email Button */}
          <TouchableOpacity 
            className="flex-row items-center justify-center bg-emerald-500 rounded-xl p-4 mt-2"
            onPress={() => router.push("/signup")}
          >
            <Mail size={20} color="#ffffff" />
            <Text className="text-white font-bold ml-2">Sign up with Email</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity 
            className="items-center py-4"
            onPress={() => router.push("/login")}
          >
            <Text className="text-slate-400">
              Already have an account? <Text className="text-emerald-400 font-bold">Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Guest Option */}
        <View className="pb-5">
          <View className="flex-row items-center my-5">
            <View className="flex-1 h-px bg-slate-700" />
            <Text className="text-slate-500 text-xs font-medium mx-3">OR</Text>
            <View className="flex-1 h-px bg-slate-700" />
          </View>

          <TouchableOpacity 
            className="items-center border border-slate-700 bg-slate-800 rounded-xl p-4"
            onPress={() => router.push("../(main)/Dashboard" as never)}
          >
            <Text className="text-white font-medium">Continue as Guest</Text>
            <Text className="text-slate-500 text-xs mt-1">Limited features available</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}