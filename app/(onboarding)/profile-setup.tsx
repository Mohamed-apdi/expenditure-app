import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Camera, User, ArrowRight } from "lucide-react-native";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import { supabase } from "~/lib";
import { createProfile, updateProfile } from "~/lib";
import { StatusBar } from "expo-status-bar";

interface FormData {
  phone: string;
  imageUrl: string;
}

interface Errors {
  phone?: string;
}

export default function ProfileSetupScreen() {
  const theme = useTheme();
  const { t } = useLanguage();
  const [formData, setFormData] = useState<FormData>({
    phone: "",
    imageUrl: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Toast.show({
          type: "error",
          text1: t.error || "Error",
          text2: t.youNeedToBeLoggedIn || "You need to be logged in",
        });
        router.replace("/(auth)/login");
        return;
      }

      setCurrentUser(user);

      // Check if user already has a profile
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (existingProfile) {
        setFormData({
          phone: existingProfile.phone || "",
          imageUrl: existingProfile.image_url || "",
        });
      }
    } catch (error) {
      console.error("Error loading user:", error);
      Toast.show({
        type: "error",
        text1: t.error || "Error",
        text2: t.failedToFetchUser || "Failed to fetch user data",
      });
    }
  };

  const updateFormData = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    if (key in errors) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Errors = {};

    // Phone validation is optional, but if provided, validate format
    if (formData.phone.trim()) {
      const phoneRegex = /^\+?[\d\s\-()]+$/;
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone =
          t.validPhoneNumber || "Please enter a valid phone number";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadImage = async (base64Data: string): Promise<string | null> => {
    if (!currentUser) return null;

    setUploadingImage(true);

    try {
      // Create a unique filename
      const fileName = `profile_${currentUser.id}_${Date.now()}.jpg`;
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
      Toast.show({
        type: "error",
        text1: t.error || "Error",
        text2: t.failedToUploadImage || "Failed to upload image",
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t.error || "Error",
          t.failedToPickImage || "Permission to access camera roll is required"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const publicUrl = await uploadImage(result.assets[0].base64);
        if (publicUrl) {
          updateFormData("imageUrl", publicUrl);
        }
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Toast.show({
        type: "error",
        text1: t.error || "Error",
        text2: t.failedToPickImage || "Failed to pick image",
      });
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!currentUser) {
      Toast.show({
        type: "error",
        text1: t.error || "Error",
        text2: t.youNeedToBeLoggedIn || "You need to be logged in",
      });
      return;
    }

    setLoading(true);

    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (existingProfile) {
        // Update existing profile
        const updateData: any = {
          image_url: formData.imageUrl || "",
        };
        if (formData.phone.trim()) {
          updateData.phone = formData.phone.trim();
        }
        await updateProfile(currentUser.id, updateData);
      } else {
        // Create new profile
        const createData: any = {
          id: currentUser.id,
          image_url: formData.imageUrl || "",
          user_type: "user",
          email: currentUser.email,
        };
        if (formData.phone.trim()) {
          createData.phone = formData.phone.trim();
        }
        await createProfile(createData);
      }

      Toast.show({
        type: "success",
        text1: t.success || "Success",
        text2: t.profileSetupSuccess,
      });

      // Navigate to dashboard
      router.replace("/(main)/Dashboard");
    } catch (error: any) {
      console.error("Save error:", error);
      Toast.show({
        type: "error",
        text1: t.error || "Error",
        text2: error.message || t.failedToSetupProfile,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace("/(main)/Dashboard");
  };

  return (
    <>
      <StatusBar style="auto" />
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Header */}
            <View className="items-center pt-8 pb-12">
              <Text
                className="text-3xl font-bold mb-2"
                style={{ color: theme.text }}
              >
                {t.setupProfile}
              </Text>
              <Text
                className="text-base text-center px-4"
                style={{ color: theme.textSecondary }}
              >
                {t.completeYourProfile}
              </Text>
            </View>

            {/* Profile Picture Section */}
            <View className="items-center mb-8">
              <TouchableOpacity
                onPress={pickImage}
                disabled={uploadingImage}
                className="relative"
              >
                {formData.imageUrl ? (
                  <Image
                    source={{ uri: formData.imageUrl }}
                    className="w-32 h-32 rounded-full border-4"
                    style={{
                      width: 128,
                      height: 128,
                      borderColor: theme.primary,
                    }}
                  />
                ) : (
                  <View
                    className="w-32 h-32 rounded-full border-4 border-dashed justify-center items-center"
                    style={{
                      borderColor: theme.border,
                      backgroundColor: theme.cardBackground,
                    }}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="large" color={theme.primary} />
                    ) : (
                      <Camera size={32} color={theme.icon} />
                    )}
                  </View>
                )}

                {/* Add Photo Button */}
                <View
                  className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full justify-center items-center"
                  style={{ backgroundColor: theme.primary }}
                >
                  <User size={20} color="white" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={pickImage}
                disabled={uploadingImage}
                className="mt-4"
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: theme.primary }}
                >
                  {uploadingImage ? t.uploadingImage : t.addPhoto}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View className="space-y-6">
              {/* Phone Number Input */}
              <View>
                <Text
                  className="text-sm font-medium mb-2"
                  style={{ color: theme.text }}
                >
                  {t.phone} ({t.optional || "Optional"})
                </Text>
                <TextInput
                  value={formData.phone}
                  onChangeText={(text) => updateFormData("phone", text)}
                  placeholder={
                    t.enterYourPhoneNumber || "Enter your phone number"
                  }
                  placeholderTextColor={theme.textSecondary}
                  className="w-full px-4 py-3 rounded-lg text-base"
                  style={{
                    backgroundColor: theme.cardBackground,
                    color: theme.text,
                    borderWidth: 1,
                    borderColor: errors.phone ? theme.error : theme.border,
                  }}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                />
                {errors.phone && (
                  <Text className="text-sm mt-1" style={{ color: theme.error }}>
                    {errors.phone}
                  </Text>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View className="mt-12 space-y-4">
              {/* Save & Continue Button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={loading || uploadingImage}
                className={`w-full py-4 rounded-lg flex-row justify-center items-center ${
                  loading || uploadingImage ? "opacity-50" : ""
                }`}
                style={{ backgroundColor: theme.primary }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <ArrowRight size={20} color="white" />
                )}
                <Text className="text-white font-semibold text-xs  ml-2">
                  {loading ? t.savingProfile : t.saveAndContinue}
                </Text>
              </TouchableOpacity>

              {/* Skip Button */}
              <TouchableOpacity
                onPress={handleSkip}
                disabled={loading || uploadingImage}
                className="w-full py-3"
              >
                <Text
                  className="text-center text-base font-medium"
                  style={{ color: theme.textSecondary }}
                >
                  {t.skipForNow}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
