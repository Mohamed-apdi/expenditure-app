// app/main/Accounts.tsx
import React, { useState } from "react";
import { View, SafeAreaView } from "react-native";
import TabSwitcher from "../components/TabSwitcher";
import AccountsContent from "../components/AccountsContent";
import TransferScreen from "../components/TransferScreen";

const Accounts = () => {
  const [activeTab, setActiveTab] = useState("Accounts");

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
      <View className="flex-1">
        {activeTab === "Accounts" ? <AccountsContent /> : <TransferScreen />}
      </View>
    </SafeAreaView>
  );
};

export default Accounts;
