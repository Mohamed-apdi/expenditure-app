import { useState } from "react";
import { View, Text, TouchableOpacity, Alert, Dimensions, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  X,
  Camera,
  Check,
  RefreshCw,
  FileText,
  ShoppingCart,
  Info,
  Edit3,
  Image,
  DollarSign,
  Calendar as CalendarIcon,
  MapPin,
  List,
  Tag,
} from "lucide-react-native";


const { width, height } = Dimensions.get("window");

type ScannedData = {
  merchant: string;
  amount: number;
  date: string;
  items: { name: string; price: number }[];
  category: string;
  tax: number;
};

export default function ReceiptScannerScreen() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);

  const handleScanReceipt = () => {
    setIsScanning(true);

    // Simulate scanning process
    setTimeout(() => {
      setIsScanning(false);
      const mockScannedData: ScannedData = {
        merchant: "Walmart Supercenter",
        amount: 45.67,
        date: "2024-01-15",
        items: [
          { name: "Milk", price: 3.99 },
          { name: "Bread", price: 2.5 },
          { name: "Eggs", price: 4.25 },
          { name: "Bananas", price: 2.15 },
          { name: "Chicken Breast", price: 12.99 },
          { name: "Rice", price: 5.49 },
          { name: "Tomatoes", price: 3.89 },
          { name: "Cheese", price: 6.75 },
          { name: "Yogurt", price: 3.66 },
        ],
        category: "Food",
        tax: 3.67,
      };
      setScannedData(mockScannedData);
    }, 3000);
  };

  const handleRetakePhoto = () => {
    setScannedData(null);
    handleScanReceipt();
  };

  const handleConfirmExpense = () => {
    Alert.alert("Success", "Expense added from receipt!", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  const handleManualEntry = () => {
    router.push("/add-expense" as any);
  };

  if (isScanning) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        {/* Scanning Header */}
        <View className="flex-row justify-between items-center px-6 py-4">
          <TouchableOpacity onPress={() => setIsScanning(false)}>
            <X size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold">Scanning Receipt</Text>
          <View className="w-6" /> {/* Spacer for alignment */}
        </View>

        {/* Camera Preview */}
        <View className="flex-1 bg-slate-800 justify-center items-center">
          <View className="w-full h-[40%] border-2 border-emerald-500 rounded-xl absolute" />
          <Camera size={48} color="#64748b" />
          <Text className="text-slate-500 mt-3">Camera View</Text>
          <Text className="text-white mt-8 text-center px-10">
            Position the receipt within the frame
          </Text>
        </View>

        {/* Processing Indicator */}
        <View className="px-6 py-8 items-center">
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-emerald-500 mr-3" />
            <Text className="text-white">Processing receipt...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (scannedData) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        {/* Review Header */}
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold">Review Receipt</Text>
          <TouchableOpacity onPress={handleRetakePhoto}>
            <RefreshCw size={20} color="#10b981" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 py-4">
          {/* Receipt Summary */}
          <View className="bg-slate-800 p-5 rounded-xl border border-slate-700 mb-5">
            <View className="flex-row items-center mb-4">
              <FileText size={24} color="#10b981" />
              <View className="ml-3 flex-1">
                <Text className="text-white font-bold">{scannedData.merchant}</Text>
                <Text className="text-slate-400 text-sm">
                  {new Date(scannedData.date).toLocaleDateString()}
                </Text>
              </View>
              <Text className="text-emerald-500 text-2xl font-bold">
                ${scannedData.amount}
              </Text>
            </View>

            <View className="pt-4 border-t border-slate-700">
              <Text className="text-slate-400 mb-2">Detected Category</Text>
              <View className="flex-row items-center bg-emerald-500/20 px-3 py-1.5 rounded-full self-start">
                <ShoppingCart size={16} color="#10b981" />
                <Text className="text-emerald-500 ml-2 font-medium">
                  {scannedData.category}
                </Text>
              </View>
            </View>
          </View>

          {/* Items List */}
          <View className="bg-slate-800 p-5 rounded-xl border border-slate-700 mb-5">
            <Text className="text-white font-bold mb-4">
              Items ({scannedData.items.length})
            </Text>
            <View className="gap-2">
              {scannedData.items.map((item, index) => (
                <View key={index} className="flex-row justify-between">
                  <Text className="text-white">{item.name}</Text>
                  <Text className="text-slate-400">${item.price}</Text>
                </View>
              ))}

              <View className="h-px bg-slate-700 my-3" />

              <View className="flex-row justify-between">
                <Text className="text-white">Tax</Text>
                <Text className="text-slate-400">${scannedData.tax}</Text>
              </View>

              <View className="flex-row justify-between mt-3">
                <Text className="text-white font-bold">Total</Text>
                <Text className="text-emerald-500 font-bold">
                  ${scannedData.amount}
                </Text>
              </View>
            </View>
          </View>

          {/* Accuracy Notice */}
          <View className="flex-row bg-slate-800 p-4 rounded-xl border border-blue-500 mb-5">
            <Info size={16} color="#3b82f6" className="mt-0.5" />
            <Text className="text-white ml-3 flex-1">
              Please review the scanned information for accuracy. You can edit details before saving.
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mb-8">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center bg-slate-800 p-4 rounded-xl border border-blue-500"
              onPress={() => router.push({ pathname: "/add-expense" as any, params: { scannedData: JSON.stringify(scannedData) } })}
            >
              <Edit3 size={20} color="#3b82f6" />
              <Text className="text-blue-500 font-semibold ml-2">Edit Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center bg-emerald-500 p-4 rounded-xl"
              onPress={handleConfirmExpense}
            >
              <Check size={20} color="#ffffff" />
              <Text className="text-white font-semibold ml-2">Add Expense</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Scan Receipt</Text>
        <View className="w-6" /> {/* Spacer for alignment */}
      </View>

      <View className="flex-1 px-6 py-5">
        {/* Instructions */}
        <View className="bg-slate-800 p-6 rounded-xl border border-slate-700 items-center mb-8">
          <Camera size={48} color="#10b981" />
          <Text className="text-white text-xl font-bold mt-4 mb-2">Scan Your Receipt</Text>
          <Text className="text-slate-400 text-center mb-6">
            Take a photo of your receipt and we'll automatically extract the expense details for you.
          </Text>

          <View className="w-full gap-2">
            <View className="flex-row items-center">
              <Check size={16} color="#10b981" />
              <Text className="text-white ml-2">Ensure good lighting</Text>
            </View>
            <View className="flex-row items-center">
              <Check size={16} color="#10b981" />
              <Text className="text-white ml-2">Keep receipt flat and straight</Text>
            </View>
            <View className="flex-row items-center">
              <Check size={16} color="#10b981" />
              <Text className="text-white ml-2">Include all text in the frame</Text>
            </View>
          </View>
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          className="flex-row items-center justify-center bg-emerald-500 py-4 rounded-xl mb-8"
          onPress={handleScanReceipt}
        >
          <Camera size={24} color="#ffffff" />
          <Text className="text-white font-bold ml-2">Take Photo</Text>
        </TouchableOpacity>

        {/* Alternative Options */}
        <View className="items-center mb-8">
          <Text className="text-slate-500 mb-4">Or</Text>
          <TouchableOpacity
            className="flex-row items-center justify-center bg-slate-800 py-3 px-6 rounded-lg border border-slate-700 mb-3 w-full"
            onPress={handleManualEntry}
          >
            <Edit3 size={20} color="#94a3b8" />
            <Text className="text-slate-400 ml-2">Enter Manually</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-center bg-slate-800 py-3 px-6 rounded-lg border border-slate-700 w-full">
            <Image size={20} color="#94a3b8" />
            <Text className="text-slate-400 ml-2">Choose from Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <Text className="text-white font-semibold mb-4">What we can detect:</Text>
          <View className="gap-3">
            <View className="flex-row items-center">
              <DollarSign size={16} color="#3b82f6" />
              <Text className="text-white ml-3">Total amount</Text>
            </View>
            <View className="flex-row items-center">
              <CalendarIcon size={16} color="#3b82f6" />
              <Text className="text-white ml-3">Date & time</Text>
            </View>
            <View className="flex-row items-center">
              <MapPin size={16} color="#3b82f6" />
              <Text className="text-white ml-3">Merchant name</Text>
            </View>
            <View className="flex-row items-center">
              <List size={16} color="#3b82f6" />
              <Text className="text-white ml-3">Individual items</Text>
            </View>
            <View className="flex-row items-center">
              <Tag size={16} color="#3b82f6" />
              <Text className="text-white ml-3">Category suggestion</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}