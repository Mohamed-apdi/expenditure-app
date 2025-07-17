import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "~/lib/supabase";
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
import { useTheme } from "~/lib/theme";
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("cash");
  const [isEssential, setIsEssential] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] =
    useState<Frequency>("monthly");

  const theme = useTheme();

  const paymentMethods = [
    { id: "cash", name: "Cash", icon: DollarSign, color: "#84cc16" },
    {
      id: "credit_card",
      name: "Credit Card",
      icon: CreditCard,
      color: "#3b82f6",
    },
    {
      id: "debit_card",
      name: "Debit Card",
      icon: CreditCard,
      color: "#8b5cf6",
    },
    {
      id: "digital_wallet",
      name: "Digital Wallet",
      icon: Wallet,
      color: "#f59e0b",
    },
  ];

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Need camera access to take receipt photos"
      );
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
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Need gallery access to upload receipts"
      );
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
      console.error("Scanning error:", error);
      Alert.alert(
        "Error",
        "Failed to process receipt. Please try again or enter manually."
      );
    } finally {
      setIsScanning(false);
    }
  };

  const uploadReceipt = async (uri: string) => {
    setUploading(true);
    try {
      // Generate unique filename
      const ext = uri.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;

      // Upload to Supabase Storage
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: fileName,
        type: `image/${ext}`,
      } as any);

      const { data, error } = await supabase.storage
        .from("receipts")
        .upload(fileName, formData);

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("receipts").getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
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

      const {
        data: { user },
      } = await supabase.auth.getUser();
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

      const { error } = await supabase.from("expenses").insert(expenseData);

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
      console.error("Error viewing receipt:", error);
      Alert.alert("Error", "Could not open receipt");
    }
  };

  if (isScanning) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 24,
            paddingVertical: 16,
          }}
        >
          <TouchableOpacity onPress={() => setIsScanning(false)}>
            <X size={24} color={theme.text} />
          </TouchableOpacity>
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            Scanning Receipt
          </Text>
          <View style={{ width: 24 }} /> {/* Spacer */}
        </View>

        {/* Image Preview or Camera Placeholder */}
        <View
          style={{
            flex: 1,
            backgroundColor: theme.cardBackground,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              resizeMode="contain"
              style={{
                width: "100%",
                height: "60%",
                aspectRatio: 1,
              }}
            />
          ) : (
            <>
              <View
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "40%",
                  borderWidth: 2,
                  borderColor: theme.primary,
                  borderRadius: 16,
                }}
              />
              <Camera size={48} color={theme.textSecondary} />
              <Text style={{ color: theme.textSecondary, marginTop: 12 }}>
                Camera View
              </Text>
            </>
          )}
          <Text
            style={{
              color: theme.text,
              marginTop: 32,
              textAlign: "center",
              paddingHorizontal: 40,
            }}
          >
            {uploading ? "Uploading receipt..." : "Processing receipt..."}
          </Text>
        </View>

        {/* Loading Indicator */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingVertical: 32,
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.text, marginTop: 12 }}>
            {uploading ? "Uploading..." : "Extracting data..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (scannedData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 24,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderColor: theme.border,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "bold" }}>
            Review Receipt
          </Text>
          <TouchableOpacity onPress={handleRetakePhoto}>
            <RefreshCw size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}
        >
          {/* Receipt Summary */}
          <View
            style={{
              backgroundColor: theme.cardBackground,
              padding: 20,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <FileText size={24} color={theme.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: "bold" }}>
                  {scannedData.merchant}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {new Date(scannedData.date).toLocaleDateString()}
                </Text>
              </View>
              <Text
                style={{
                  color: theme.primary,
                  fontSize: 22,
                  fontWeight: "bold",
                }}
              >
                ${scannedData.amount.toFixed(2)}
              </Text>
            </View>

            <View
              style={{
                borderTopWidth: 1,
                borderColor: theme.border,
                paddingTop: 16,
              }}
            >
              <Text style={{ color: theme.textSecondary, marginBottom: 8 }}>
                Detected Category
              </Text>
              <View
                style={{
                  backgroundColor: `${theme.primary}33`,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: 999,
                  alignSelf: "flex-start",
                }}
              >
                <ShoppingCart size={16} color={theme.primary} />
                <Text
                  style={{
                    color: theme.primary,
                    marginLeft: 8,
                    fontWeight: "500",
                  }}
                >
                  {scannedData.category}
                </Text>
              </View>
            </View>
          </View>

          {/* Receipt Image */}
          {scannedData.receiptUrl && (
            <TouchableOpacity
              style={{
                backgroundColor: theme.cardBackground,
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 20,
              }}
              onPress={viewReceipt}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: "bold" }}>
                  Receipt Image
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ color: "#3b82f6", marginRight: 6 }}>View</Text>
                  <ArrowUpRight size={16} color="#3b82f6" />
                </View>
              </View>
              <Image
                source={{ uri: scannedData.receiptUrl }}
                style={{ width: "100%", aspectRatio: 1 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

          {/* Items List */}
          <View
            style={{
              backgroundColor: theme.cardBackground,
              padding: 20,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontWeight: "bold",
                marginBottom: 16,
              }}
            >
              Items ({scannedData.items.length})
            </Text>

            {scannedData.items.map((item, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text style={{ color: theme.text }}>{item.name}</Text>
                <Text style={{ color: theme.textSecondary }}>
                  ${item.price.toFixed(2)}
                </Text>
              </View>
            ))}

            <View
              style={{
                height: 1,
                backgroundColor: theme.border,
                marginVertical: 12,
              }}
            />

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: theme.text }}>Tax</Text>
              <Text style={{ color: theme.textSecondary }}>
                ${scannedData.tax.toFixed(2)}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 12,
              }}
            >
              <Text style={{ color: theme.text, fontWeight: "bold" }}>
                Total
              </Text>
              <Text style={{ color: theme.primary, fontWeight: "bold" }}>
                ${scannedData.amount.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Payment Method */}
          <View
            style={{
              backgroundColor: theme.cardBackground,
              padding: 20,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 16,
              }}
            >
              Payment Method
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {paymentMethods.map((method) => {
                const selected = selectedPaymentMethod === method.id;
                return (
                  <TouchableOpacity
                    key={method.id}
                    onPress={() => setSelectedPaymentMethod(method.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: selected ? theme.primary : theme.border,
                      backgroundColor: selected
                        ? `${theme.primary}20`
                        : theme.cardBackground,
                      minWidth: "45%",
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        backgroundColor: selected
                          ? theme.primary
                          : `${method.color}33`,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 8,
                      }}
                    >
                      <method.icon
                        size={16}
                        color={selected ? "#fff" : method.color}
                      />
                    </View>
                    <Text
                      style={{
                        color: selected ? theme.primary : theme.textSecondary,
                        fontWeight: selected ? "600" : "400",
                      }}
                    >
                      {method.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Essential Toggle */}
          <View
            style={{
              backgroundColor: theme.cardBackground,
              padding: 20,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: theme.text, fontSize: 18, fontWeight: "bold" }}
              >
                Essential Expense
              </Text>
              <TouchableOpacity
                onPress={() => setIsEssential(!isEssential)}
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 999,
                  backgroundColor: isEssential ? theme.primary : theme.border,
                  justifyContent: "center",
                  padding: 2,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: "#fff",
                    borderRadius: 999,
                    alignSelf: isEssential ? "flex-end" : "flex-start",
                  }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Recurring Option */}
          <View
            style={{
              backgroundColor: theme.cardBackground,
              padding: 20,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text
                style={{ color: theme.text, fontSize: 18, fontWeight: "bold" }}
              >
                Recurring Expense
              </Text>
              <TouchableOpacity
                onPress={() => setIsRecurring(!isRecurring)}
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 999,
                  backgroundColor: isRecurring ? theme.primary : theme.border,
                  justifyContent: "center",
                  padding: 2,
                }}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white ${
                    isRecurring ? "self-end" : "self-start"
                  }`}
                />
              </TouchableOpacity>
            </View>

            {isRecurring && (
              <>
                <Text style={{ color: theme.textSecondary, marginBottom: 8 }}>
                  Frequency
                </Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {["weekly", "monthly", "yearly"].map((freq) => {
                    const selected = recurringFrequency === freq;
                    return (
                      <TouchableOpacity
                        key={freq}
                        onPress={() => setRecurringFrequency(freq)}
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: selected ? theme.primary : theme.border,
                          backgroundColor: selected
                            ? theme.primary
                            : theme.cardBackground,
                        }}
                      >
                        <Text
                          style={{
                            textAlign: "center",
                            color: selected ? "#fff" : theme.textSecondary,
                            fontWeight: selected ? "600" : "500",
                          }}
                        >
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </View>

          {/* Accuracy Notice */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#3b82f6",
              marginBottom: 20,
            }}
          >
            <Info size={16} color="#3b82f6" style={{ marginTop: 2 }} />
            <Text style={{ color: theme.text, marginLeft: 12, flex: 1 }}>
              Please review the scanned information for accuracy. You can edit
              details before saving.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 32 }}>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(expense)/AddExpense",
                  params: {
                    scannedData: JSON.stringify(scannedData),
                  },
                })
              }
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: theme.cardBackground,
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#3b82f6",
              }}
            >
              <Edit3 size={20} color="#3b82f6" />
              <Text
                style={{ color: "#3b82f6", fontWeight: "600", marginLeft: 8 }}
              >
                Edit Details
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSaveScannedExpense}
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: theme.primary,
                padding: 16,
                borderRadius: 16,
              }}
            >
              <Check size={20} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600", marginLeft: 8 }}>
                Add Expense
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "bold" }}>
          Scan Receipt
        </Text>
        <View style={{ width: 24 }} /> {/* spacer */}
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 20 }}>
        {/* Instructions */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 24,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <Camera size={48} color={theme.primary} />
          <Text
            style={{
              color: theme.text,
              fontSize: 20,
              fontWeight: "bold",
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            Scan Your Receipt
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            Take a photo of your receipt and we'll automatically extract the
            expense details for you.
          </Text>

          <View style={{ width: "100%", gap: 8 }}>
            {[
              "Ensure good lighting",
              "Keep receipt flat and straight",
              "Include all text in the frame",
            ].map((tip, index) => (
              <View
                key={index}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <Check size={16} color={theme.primary} />
                <Text style={{ color: theme.text, marginLeft: 8 }}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.primary,
            paddingVertical: 16,
            borderRadius: 16,
            marginBottom: 32,
          }}
          onPress={handleTakePhoto}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Camera size={24} color="#ffffff" />
              <Text
                style={{ color: "#ffffff", fontWeight: "bold", marginLeft: 8 }}
              >
                Take Photo
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Alternative Options */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <Text style={{ color: theme.textSecondary, marginBottom: 16 }}>
            Or
          </Text>

          {/* Manual Entry */}
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.cardBackground,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 12,
              width: "100%",
            }}
            onPress={handleManualEntry}
          >
            <Edit3 size={20} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, marginLeft: 8 }}>
              Enter Manually
            </Text>
          </TouchableOpacity>

          {/* Choose from Gallery */}
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.cardBackground,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              width: "100%",
            }}
            onPress={handleChooseFromGallery}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={theme.textSecondary} />
            ) : (
              <>
                <ImageIcon size={20} color={theme.textSecondary} />
                <Text style={{ color: theme.textSecondary, marginLeft: 8 }}>
                  Choose from Gallery
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 20,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text
            style={{
              color: theme.text,
              fontWeight: "600",
              marginBottom: 16,
            }}
          >
            What we can detect:
          </Text>
          {[
            { icon: DollarSign, label: "Total amount" },
            { icon: CalendarIcon, label: "Date & time" },
            { icon: MapPin, label: "Merchant name" },
            { icon: List, label: "Individual items" },
            { icon: Tag, label: "Category suggestion" },
          ].map(({ icon: Icon, label }, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Icon size={16} color="#3b82f6" />
              <Text style={{ color: theme.text, marginLeft: 12 }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
