import { useRouter, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "~/lib/theme";

export default function TransferDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();
  // Use the params directly or fall back to mock data if params are empty
  const transferData = params.id
    ? {
        id: params.id,
        type: params.type || "Transfer",
        account: {
          from: params.from || "somnet",
          to: params.to || "hormuud",
        },
        amount: {
          from: params.amountFrom || 50,
          to: params.amountTo || 50,
        },
        date: params.date || new Date().toISOString().split("T")[0],
        time_added: params.time_added || new Date().toISOString(),
        note: params.note || "",
      }
    : {
        id: "1",
        type: "Transfer",
        account: {
          from: "somnet",
          to: "hormuud",
        },
        amount: {
          from: 50,
          to: 50,
        },
        date: "2025-08-15",
        time_added: "2025-08-15T19:22:42",
        note: "Rent",
      };

  // Convert amount values to numbers if they came as strings from params
  const amountFrom =
    typeof transferData.amount.from === "string"
      ? Number.parseFloat(transferData.amount.from)
      : transferData.amount.from;
  const amountTo =
    typeof transferData.amount.to === "string"
      ? Number.parseFloat(transferData.amount.to)
      : transferData.amount.to;

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1 bg-white">
        {/* Header */}
        <View
          className="flex-row justify-between items-center px-6 py-4 border-b"
          style={{ borderColor: theme.border }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={24} color={theme.icon} />
          </TouchableOpacity>
          <Text className="text-xl flex-1 text-center flex-shrink font-semibold text-black">
            Transfer Details
          </Text>
          <View className="w-6" />
        </View>

        <ScrollView className="flex-1 p-5">
          {/* Transfer Status */}
          <View className="bg-blue-50 rounded-xl p-6 items-center flex-col justify-between  mb-5 shadow-sm shadow-blue-500/10">
            <View className="w-16 h-16 rounded-full bg-blue-500 items-center justify-center mb-4">
              <Text className="text-white text-2xl font-bold">✓</Text>
            </View>
            <Text
              className="text-lg text-center font-semibold mb-2"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Transfer Completed
            </Text>

            <Text className="text-sm text-gray-500 text-center">
              Your money has been sent successfully
            </Text>
          </View>
          {/* Transfer Details Card */}
          <View className="bg-blue-50 rounded-xl p-5 mb-5 shadow-sm shadow-blue-500/10">
            {/* Transfer ID */}
            <View className="flex-row justify-between items-center py-3 border-b border-blue-100">
              <Text className="text-sm text-gray-500 font-medium">
                Transfer ID
              </Text>
              <Text
                ellipsizeMode="tail"
                className="text-sm text-black font-semibold flex-1 text-right flex-shrink"
              >
                #{transferData.id}
              </Text>
            </View>

            {/* Type */}
            <View className="flex-row justify-between items-center py-3 border-b border-blue-100">
              <Text className="text-sm text-gray-500 font-medium">Type</Text>
              <Text className="text-sm text-black font-semibold flex-1 text-right flex-shrink">
                {transferData.type}
              </Text>
            </View>

            {/* From Account */}
            <View className="flex-row justify-between items-center py-3 border-b border-blue-100">
              <Text className="text-sm text-gray-500 font-medium">
                From Account
              </Text>
              <Text className="text-sm text-black font-semibold flex-1 text-right flex-shrink">
                {transferData.account.from}
              </Text>
            </View>

            {/* To Account */}
            <View className="flex-row justify-between items-center py-3 border-b border-blue-100">
              <Text className="text-sm text-gray-500 font-medium">
                To Account
              </Text>
              <Text className="text-sm text-black font-semibold flex-1 text-right flex-shrink">
                {transferData.account.to}
              </Text>
            </View>

            {/* Amount Sent */}
            <View className="flex-row justify-between items-center py-3 border-b border-blue-100">
              <Text className="text-sm text-gray-500 font-medium">
                Amount Sent
              </Text>
              <Text className="text-base text-blue-500 font-bold flex-1 text-right flex-shrink">
                ${amountFrom}
              </Text>
            </View>

            {/* Amount Received */}
            <View className="flex-row justify-between items-center py-3 border-b border-blue-100">
              <Text className="text-sm text-gray-500 font-medium">
                Amount Received
              </Text>
              <Text className="text-base text-blue-500 font-bold flex-1 text-right flex-shrink">
                ${amountTo}
              </Text>
            </View>

            {/* Date */}
            <View className="flex-row justify-between items-center py-3 border-b border-blue-100">
              <Text className="text-sm text-gray-500 font-medium">Date</Text>
              <Text className="text-sm text-black font-semibold flex-1 text-right flex-shrink">
                {transferData.date}
              </Text>
            </View>

            {/* Time */}
            <View className="flex-row justify-between items-center py-3 border-b border-blue-100">
              <Text className="text-sm text-gray-500 font-medium">Time</Text>
              <Text className="text-sm text-black font-semibold flex-1 text-right flex-shrink">
                {new Date(transferData.time_added).toLocaleTimeString()}
              </Text>
            </View>

            {/* Note */}
            {transferData.note && (
              <View className="flex-row justify-between items-center py-3">
                <Text className="text-sm text-gray-500 font-medium">Note</Text>
                <Text className="text-sm text-black font-semibold flex-1 text-right flex-shrink">
                  {transferData.note}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            <TouchableOpacity className="bg-blue-500 rounded-lg py-4 items-center">
              <Text className="text-white text-base font-semibold">DONE</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
