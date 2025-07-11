import { useState } from "react";
import { View, Text, TouchableOpacity, Alert, Dimensions, ScrollView, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '~/lib/supabase';
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
  Image as ImageIcon,
  DollarSign,
  Calendar as CalendarIcon,
  MapPin,
  List,
  Tag,
  Upload,
  ArrowUpRight,
  CreditCard,
  Wallet,
} from "lucide-react-native";
import { scanReceiptWithOCR } from "~/lib/ocr";
import Toast from "react-native-toast-message";
const { width, height } = Dimensions.get("window");

type ScannedData = {
  merchant: string;
  amount: number;
  date: string;
  items: { name: string; price: number }[];
  category: string;
  tax: number;
  receiptUrl?: string;
};
type Frequency = "weekly" | "monthly" | "yearly";
export default function ReceiptScannerScreen() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("cash");
  const [isEssential, setIsEssential] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<Frequency>("monthly");

  const paymentMethods = [
  { id: "cash", name: "Cash", icon: DollarSign, color: "#84cc16" },
  { id: "credit_card", name: "Credit Card", icon: CreditCard, color: "#3b82f6" },
  { id: "debit_card", name: "Debit Card", icon: CreditCard, color: "#8b5cf6" },
  { id: "digital_wallet", name: "Digital Wallet", icon: Wallet, color: "#f59e0b" },
];

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Need camera access to take receipt photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      handleScanReceipt(result.assets[0].uri);
    }
  };

  const handleChooseFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Need gallery access to upload receipts');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      handleScanReceipt(result.assets[0].uri);
    }
  };

  

  const handleScanReceipt = async (uri: string) => {
    setIsScanning(true);
    
    try {
      // First upload the receipt image to Supabase for storage
      const receiptUrl = await uploadReceipt(uri);
      
      // Then process with OCR.space
      const scannedData = await scanReceiptWithOCR(uri);
      
      // Combine with the receipt URL
      setScannedData({
        ...scannedData,
        receiptUrl,
      });
    } catch (error) {
      console.error('Scanning error:', error);
      Alert.alert('Error', 'Failed to process receipt. Please try again or enter manually.');
    } finally {
      setIsScanning(false);
    }
  };

  const uploadReceipt = async (uri: string) => {
    setUploading(true);
    try {
      // Generate unique filename
      const ext = uri.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;

      // Upload to Supabase Storage
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: `image/${ext}`,
      } as any);

      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, formData);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleRetakePhoto = () => {
    setScannedData(null);
    setImageUri(null);
  };

  const handleManualEntry = () => {
    router.push("/(expense)/AddExpense");
  };

  // Update your handleSaveScannedExpense function
const handleSaveScannedExpense = async () => {
  if (!scannedData) return;

  try {
    setIsSubmitting(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const expenseData = {
      user_id: user.id,
      amount: scannedData.amount,
      category: scannedData.category,
      description: `${scannedData.merchant} Purchase`,
      date: scannedData.date,
      payment_method: selectedPaymentMethod,
      is_recurring: isRecurring,
      recurrence_interval: isRecurring ? recurringFrequency : null,
      is_essential: isEssential,
      tags: [],
      receipt_url: scannedData.receiptUrl || null,
    };

    const { error } = await supabase
      .from("expenses")
      .insert(expenseData);

    if (error) throw error;

    // ✅ Show toast success
    Toast.show({
      type: "success",
      text1: "Expense Added",
      text2: "Your expense has been saved successfully.",
    });

    // ✅ Redirect after 2 seconds
    setTimeout(() => {
      router.replace("/(main)/ExpenseListScreen");
    }, 2000);
    
  } catch (error) {
    console.error("Error saving expense:", error);
    Alert.alert("Error", "Failed to save expense. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
};

  const viewReceipt = async () => {
    if (!scannedData?.receiptUrl) return;
    
    try {
      await Linking.openURL(scannedData.receiptUrl);
    } catch (error) {
      console.error('Error viewing receipt:', error);
      Alert.alert('Error', 'Could not open receipt');
    }
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

        {/* Image Preview */}
        <View className="flex-1 bg-slate-800 justify-center items-center">
          {imageUri ? (
            <Image 
              source={{ uri: imageUri }} 
              className="w-full h-[60%]"
              resizeMode="contain"
              style={{ aspectRatio: 1 }} // Maintain original aspect ratio
            />
          ) : (
            <>
              <View className="w-full h-[40%] border-2 border-emerald-500 rounded-xl absolute" />
              <Camera size={48} color="#64748b" />
              <Text className="text-slate-500 mt-3">Camera View</Text>
            </>
          )}
          <Text className="text-white mt-8 text-center px-10">
            {uploading ? "Uploading receipt..." : "Processing receipt..."}
          </Text>
        </View>

        {/* Processing Indicator */}
        <View className="px-6 py-8 items-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-white mt-3">
            {uploading ? "Uploading..." : "Extracting data..."}
          </Text>
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
                ${scannedData.amount.toFixed(2)}
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

          {/* Receipt Image Preview */}
          {scannedData.receiptUrl && (
            <TouchableOpacity 
              className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-5"
              onPress={viewReceipt}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-white font-bold">Receipt Image</Text>
                <View className="flex-row items-center">
                  <Text className="text-blue-500 mr-2">View</Text>
                  <ArrowUpRight size={16} color="#3b82f6" />
                </View>
              </View>
              <Image 
                source={{ uri: scannedData.receiptUrl }} 
                className="w-full"
                style={{ height: undefined, aspectRatio: 1 }} // Flexible height
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

          {/* Items List */}
          <View className="bg-slate-800 p-5 rounded-xl border border-slate-700 mb-5">
            <Text className="text-white font-bold mb-4">
              Items ({scannedData.items.length})
            </Text>
            <View className="gap-2">
              {scannedData.items.map((item, index) => (
                <View key={index} className="flex-row justify-between">
                  <Text className="text-white">{item.name}</Text>
                  <Text className="text-slate-400">${item.price.toFixed(2)}</Text>
                </View>
              ))}

              <View className="h-px bg-slate-700 my-3" />

              <View className="flex-row justify-between">
                <Text className="text-white">Tax</Text>
                <Text className="text-slate-400">${scannedData.tax.toFixed(2)}</Text>
              </View>

              <View className="flex-row justify-between mt-3">
                <Text className="text-white font-bold">Total</Text>
                <Text className="text-emerald-500 font-bold">
                  ${scannedData.amount.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Method Selection */}
          <View className="bg-slate-800 p-5 rounded-xl border border-slate-700 mb-5">
            <Text className="text-white text-lg font-bold mb-4">Payment Method</Text>
            <View className="flex-row flex-wrap gap-3">
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  className={`flex-1 min-w-[45%] flex-row items-center bg-slate-800 p-3 rounded-lg border ${
                    selectedPaymentMethod === method.id
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-700"
                  }`}
                  onPress={() => setSelectedPaymentMethod(method.id as PaymentMethod)}
                >
                  <View
                    style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 8,
                    backgroundColor: selectedPaymentMethod === method.id
                      ? "#10b981"
                      : `${method.color}33`, // 33 is ~20% opacity in hex
                  }}
                  >
                    <method.icon
                      size={16}
                      color={selectedPaymentMethod === method.id ? "#ffffff" : method.color}
                    />
                  </View>
                  <Text
                    className={`${
                      selectedPaymentMethod === method.id
                        ? "text-emerald-500 font-semibold"
                        : "text-slate-400"
                    }`}
                  >
                    {method.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Essential Expense Toggle */}
          <View className="bg-slate-800 p-5 rounded-xl border border-slate-700 mb-5">
            <View className="flex-row justify-between items-center">
              <Text className="text-white text-lg font-bold">Essential Expense</Text>
              <TouchableOpacity
                className={`w-12 h-7 rounded-full justify-center ${
                  isEssential ? "bg-emerald-500" : "bg-slate-700"
                }`}
                onPress={() => setIsEssential(!isEssential)}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white ${
                    isEssential ? "self-end" : "self-start"
                  }`}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Recurring Option */}
          <View className="bg-slate-800 p-5 rounded-xl border border-slate-700 mb-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-lg font-bold">Recurring Expense</Text>
              <TouchableOpacity
                className={`w-12 h-7 rounded-full justify-center ${
                  isRecurring ? "bg-emerald-500" : "bg-slate-700"
                }`}
                onPress={() => setIsRecurring(!isRecurring)}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white ${
                    isRecurring ? "self-end" : "self-start"
                  }`}
                />
              </TouchableOpacity>
            </View>

            {isRecurring && (
              <View>
                <Text className="text-slate-400 mb-3">Frequency</Text>
                <View className="flex-row gap-3">
                  {["weekly", "monthly", "yearly"].map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      className={`flex-1 py-3 rounded-lg border ${
                        recurringFrequency === freq
                          ? "bg-emerald-500 border-emerald-500"
                          : "bg-slate-800 border-slate-700"
                      }`}
                      onPress={() => setRecurringFrequency(freq as Frequency)}
                    >
                      <Text
                        className={`text-center font-medium ${
                          recurringFrequency === freq
                            ? "text-white font-semibold"
                            : "text-slate-400"
                        }`}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
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
              onPress={() => router.push({ 
                pathname: "/(expense)/AddExpense", 
                params: { 
                  scannedData: JSON.stringify(scannedData) 
                } 
              })}
            >
              <Edit3 size={20} color="#3b82f6" />
              <Text className="text-blue-500 font-semibold ml-2">Edit Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center bg-emerald-500 p-4 rounded-xl"
              onPress={handleSaveScannedExpense}
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
          onPress={handleTakePhoto}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Camera size={24} color="#ffffff" />
              <Text className="text-white font-bold ml-2">Take Photo</Text>
            </>
          )}
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
          <TouchableOpacity 
            className="flex-row items-center justify-center bg-slate-800 py-3 px-6 rounded-lg border border-slate-700 w-full"
            onPress={handleChooseFromGallery}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#94a3b8" />
            ) : (
              <>
                <ImageIcon size={20} color="#94a3b8" />
                <Text className="text-slate-400 ml-2">Choose from Gallery</Text>
              </>
            )}
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