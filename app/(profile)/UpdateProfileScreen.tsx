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
import { supabase } from "~/lib";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
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
  const { t } = useLanguage();
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
          Alert.alert(t.error, t.youNeedToBeLoggedIn);
          router.back();
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        Alert.alert(t.error, t.failedToFetchUser);
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
      newErrors.fullName = t.fullNameRequired;
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = t.fullNameMinLength;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = t.emailRequired;
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = t.validEmailAddress;
    }

    const phoneRegex = /^\+?[\d\s\-()]+$/;
    if (!formData.phone.trim()) {
      newErrors.phone = t.phoneRequired;
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = t.validPhoneNumber;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!currentUserId) {
      Alert.alert(t.error, t.userNotAuthenticated);
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

      Alert.alert(t.success, t.profileUpdatedSuccessfully, [
        {
          text: t.ok,
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
      Alert.alert(t.error, error.message || t.failedToUpdateProfile);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(t.discardChanges, t.unsavedChangesMessage, [
        { text: t.keepEditing, style: "cancel" },
        {
          text: t.discard,
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
      ]);
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
      Alert.alert(t.error, error.message || t.failedToUploadImage);
      return null;
    } finally {
      setLoading(false);
    }
  };
  const handleChangePhoto = () => {
    Alert.alert(t.changeProfilePhoto, t.chooseAnOption, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.takePhoto,
        onPress: () => pickImage(true),
      },
      {
        text: t.chooseFromLibrary,
        onPress: () => pickImage(false),
      },
      {
        text: t.removePhoto,
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
      Alert.alert(t.error, t.failedToPickImage);
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
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
            <TouchableOpacity className="p-2" onPress={handleCancel}>
              <X size={24} color={theme.icon} />
            </TouchableOpacity>
            <Text style={{ color: theme.text }} className=" text-lg font-bold">
              {t.updateProfile}
            </Text>
            <TouchableOpacity
              className={`py-2 px-4 rounded-lg ${!hasChanges || loading ? "bg-slate-700" : "bg-emerald-500"}`}
              onPress={handleSave}
              disabled={!hasChanges || loading}
            >
              <Text
                className={`text-sm font-bold ${!hasChanges || loading ? "text-slate-500" : "text-white"}`}
              >
                {loading ? t.saving : t.save}
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
                {t.tapToChangePhoto}
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
                  {t.fullName}
                </Text>
                <View
                  className="flex-row items-center rounded-xl border px-4"
                  style={{
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
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
                    placeholder={t.enterYourFullName}
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
                  {t.emailAddress}
                </Text>
                <View
                  className="flex-row items-center rounded-xl border px-4"
                  style={{
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
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
                  {t.phoneNumber}
                </Text>
                <View
                  className="flex-row items-center rounded-xl border px-4"
                  style={{
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
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
                    placeholder={t.enterYourPhoneNumber}
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
                  {t.includeCountryCode}
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
                {t.profileInfoEncrypted}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScrollView>
  );
}
