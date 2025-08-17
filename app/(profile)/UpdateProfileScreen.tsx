import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  X,
  Camera,
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  Info,
  ChevronRight,
} from "lucide-react-native";
import { supabase } from "~/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { useTheme } from "~/lib/theme";
type FormData = {
  fullName: string;
  email: string;
  phone: string;
  image_url: string;
};

type Errors = {
  fullName?: string;
  email?: string;
  phone?: string;
};

export default function UpdateProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userProfile = params.userProfile
    ? JSON.parse(params.userProfile as string)
    : {};
  const focusField = params.focusField as string | undefined;

  const [formData, setFormData] = useState<FormData>({
    fullName: userProfile?.fullName || "",
    email: userProfile?.email || "",
    phone: userProfile?.phone || "",
    image_url: userProfile?.image_url || "",
  });
  console.log("Image URL:", formData.image_url);
  console.log("Full user data:", formData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fullNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const theme = useTheme();

  // Get current user ID when component mounts
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        } else {
          Alert.alert(
            "Error",
            "You need to be logged in to update your profile"
          );
          router.back();
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        Alert.alert("Error", "Failed to fetch user data");
        router.back();
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (focusField) {
      setTimeout(() => {
        switch (focusField) {
          case "fullName":
            fullNameRef.current?.focus();
            break;
          case "email":
            emailRef.current?.focus();
            break;
          case "phone":
            phoneRef.current?.focus();
            break;
        }
      }, 500);
    }
  }, [focusField]);

  const updateFormData = <K extends keyof FormData & keyof Errors>(
    key: K | keyof FormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    if (key in errors) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Errors = {};
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    const phoneRegex = /^\+?[\d\s\-()]+$/;
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!currentUserId) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          image_url: formData.image_url, // This will be included in the update
        })
        .eq("id", currentUserId);

      if (error) throw error;

      Alert.alert("Success", "Profile updated successfully!", [
        {
          text: "OK",
          onPress: () =>
            router.push({
              pathname: "../(main)/ProfileScreen",
              params: {
                updated: "true",
                timestamp: Date.now(),
              },
            }),
        },
      ]);
    } catch (error: any) {
      console.error("Update error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        "Discard Changes",
        "You have unsaved changes. Are you sure you want to go back?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () =>
              router.push({
                pathname: "../(main)/ProfileScreen",
                params: {
                  updated: "true",
                  timestamp: Date.now(),
                },
              }),
          },
        ]
      );
    } else {
      router.back();
    }
  };
  const uploadImage = async (base64Data: string): Promise<string | null> => {
    if (!currentUserId) return null;

    setLoading(true);

    try {
      // Create a unique filename
      const fileName = `profile_${currentUserId}_${Date.now()}.jpg`;
      const filePath = `profile_images/${fileName}`;

      // Upload the image to Supabase Storage
      const { data, error } = await supabase.storage
        .from("images")
        .upload(filePath, decode(base64Data), {
          contentType: "image/jpeg",
        });

      if (error) throw error;

      // Get the public URL of the uploaded image
      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert("Error", error.message || "Failed to upload image");
      return null;
    } finally {
      setLoading(false);
    }
  };
  const handleChangePhoto = () => {
    Alert.alert("Change Profile Photo", "Choose an option", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Take Photo",
        onPress: () => pickImage(true),
      },
      {
        text: "Choose from Library",
        onPress: () => pickImage(false),
      },
      {
        text: "Remove Photo",
        style: "destructive",
        onPress: () => updateFormData("image_url", ""),
      },
    ]);
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      let result;

      if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
          base64: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0].base64) {
        const publicUrl = await uploadImage(result.assets[0].base64);
        if (publicUrl) {
          updateFormData("image_url", publicUrl);
        }
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };
  return (
    <ScrollView>
      <SafeAreaView
        className="flex-1"
        tyle={{ backgroundColor: theme.background }}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ borderBottomColor: theme.border }}
        >
          {/* Header */}
          <View
            className="flex-row justify-between items-center px-6 py-4 border-b "
            style={{ borderColor: theme.border }}
          >
            <TouchableOpacity className="p-2" onPress={handleCancel}>
              <X size={24} color={theme.icon} />
            </TouchableOpacity>
            <Text style={{ color: theme.text }} className=" text-lg font-bold">
              Update Profile
            </Text>
            <TouchableOpacity
              className={`py-2 px-4 rounded-lg ${!hasChanges || loading ? "bg-slate-700" : "bg-[#3b82f6]"}`}
              onPress={handleSave}
              disabled={!hasChanges || loading}
            >
              <Text
                className={`text-sm font-bold ${!hasChanges || loading ? "text-slate-500" : "text-white"}`}
              >
                {loading ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {/* Profile Photo Section */}
            <View className="items-center py-8 px-6">
              <View className="relative mb-3">
                {formData.image_url ? (
                  <Image
                    source={{ uri: formData.image_url }}
                    className="w-32 h-32 rounded-full border-4 border-emerald-500"
                    style={{
                      width: 128,
                      height: 128,
                      borderColor: theme.border,
                    }}
                  />
                ) : (
                  <View
                    className="w-32 h-32 rounded-full  border-4 justify-center items-center"
                    style={{
                      backgroundColor: theme.cardBackground,
                      borderColor: theme.border,
                      borderWidth: 4,
                    }}
                  >
                    <User size={40} color={theme.icon} />
                  </View>
                )}
                <TouchableOpacity
                  className="absolute bottom-0 right-0 w-9 h-9 rounded-full justify-center items-center border-[3px]"
                  style={{
                    backgroundColor: theme.primary,
                    borderColor: theme.border,
                  }}
                  onPress={handleChangePhoto}
                >
                  <Camera size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <Text
                className=" text-sm text-center"
                style={{ color: theme.textSecondary }}
              >
                Tap to change your profile photo
              </Text>
            </View>

            {/* Form Fields */}
            <View className="px-6">
              {/* Full Name */}
              <View className="mb-6">
                <Text
                  style={{ color: theme.text }}
                  className=" text-sm font-semibold mb-2"
                >
                  Full Name
                </Text>
                <View
                  className="flex-row items-center rounded-xl border-b px-4"
                  style={{
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.border,
                  }}
                >
                  <User
                    size={20}
                    color={theme.textSecondary}
                    className="mr-3"
                  />
                  <TextInput
                    ref={fullNameRef}
                    className="flex-1 py-4 text-white text-base"
                    placeholder="Enter your full name"
                    placeholderTextColor={theme.placeholder}
                    style={{ color: theme.text }}
                    value={formData.fullName}
                    onChangeText={(value) => updateFormData("fullName", value)}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
                {errors.fullName && (
                  <Text className="text-red-500 text-xs mt-1 ml-1">
                    {errors.fullName}
                  </Text>
                )}
              </View>

              {/* Email */}
              <View className="mb-6">
                <Text
                  style={{ color: theme.text }}
                  className=" text-sm font-semibold mb-2"
                >
                  Email Address
                </Text>
                <View
                  className="flex-row items-center rounded-xl border-b px-4"
                  style={{
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.border,
                  }}
                >
                  <Mail
                    size={20}
                    color={theme.textSecondary}
                    className="mr-3"
                  />
                  <TextInput
                    ref={emailRef}
                    className="flex-1 py-4 text-slate-400 text-base"
                    value={formData.email}
                    editable={false}
                    selectTextOnFocus={false}
                  />
                </View>
                {errors.email && (
                  <Text className="text-red-500 text-xs mt-1 ml-1">
                    {errors.email}
                  </Text>
                )}
              </View>

              {/* Phone Number */}
              <View className="mb-6">
                <Text
                  style={{ color: theme.text }}
                  className=" text-sm font-semibold mb-2"
                >
                  Phone Number
                </Text>
                <View
                  className="flex-row items-center rounded-xl border-b px-4"
                  style={{
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.border,
                  }}
                >
                  <Phone
                    size={20}
                    color={theme.textSecondary}
                    className="mr-3"
                  />
                  <TextInput
                    ref={phoneRef}
                    className="flex-1 py-4 text-white text-base"
                    placeholder="Enter your phone number"
                    placeholderTextColor={theme.placeholder}
                    style={{ color: theme.text }}
                    value={formData.phone}
                    onChangeText={(value) => updateFormData("phone", value)}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                  />
                </View>
                {errors.phone && (
                  <Text className="text-red-500 text-xs mt-1 ml-1">
                    {errors.phone}
                  </Text>
                )}
                <Text
                  className=" text-xs mt-1 ml-1"
                  style={{ color: theme.textSecondary }}
                >
                  Include country code (e.g., +1 555 123 4567)
                </Text>
              </View>
            </View>

            {/* Info Box */}
            <View
              className="flex-row items-start mx-6 my-4 p-4 rounded-xl border"
              style={{
                backgroundColor: theme.cardBackground,
                borderColor: "#3b82f6",
              }}
            >
              <Info size={20} color="#3b82f6" />
              <Text
                className="text-sm ml-3 flex-1"
                style={{ color: theme.textSecondary }}
              >
                Your profile information is encrypted and stored securely. We
                never share your personal data with third parties.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScrollView>
  );
}
