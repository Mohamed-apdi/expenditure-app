import React from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "~/lib";

const EditTransactionScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <Text style={{ color: theme.text }}>Edit Transaction</Text>
    </SafeAreaView>
  );
};

export default EditTransactionScreen;
