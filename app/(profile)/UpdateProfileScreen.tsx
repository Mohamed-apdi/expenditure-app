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

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          image_url: formData.image_url,
        })
        .eq("id", currentUserId);

      if (error) throw error;

      Alert.alert(t.success, t.profileUpdatedSuccessfully, [
        {
          text: t.ok,
          onPress: () =>
            router.push({
              pathname: "../(main)/SettingScreen",
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
              pathname: "../(main)/SettingScreen",
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <TouchableOpacity
            style={{
              padding: 8,
              borderRadius: 12,
              backgroundColor: theme.cardBackground,
            }}
            onPress={handleCancel}
          >
            <X size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "bold" }}>
            {t.updateProfile || "Edit Profile"}
          </Text>
          <TouchableOpacity
            style={{
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 12,
              backgroundColor: hasChanges ? theme.primary : theme.cardBackground,
            }}
            onPress={handleSave}
            disabled={!hasChanges}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: hasChanges ? theme.primaryText : theme.textMuted,
              }}
            >
              {t.save}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
            {/* Profile Photo */}
            <View style={{ alignItems: "center", marginBottom: 32 }}>
              <View className="relative">
                {formData.image_url ? (
                  <Image
                    source={{ uri: formData.image_url }}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      borderWidth: 3,
                      borderColor: theme.primary,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      backgroundColor: theme.cardBackground,
                      borderWidth: 3,
                      borderColor: theme.border,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <User size={36} color={theme.textMuted} />
                  </View>
                )}
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.primary,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 3,
                    borderColor: theme.background,
                  }}
                  onPress={handleChangePhoto}
                >
                  <Camera size={14} color={theme.primaryText} />
                </TouchableOpacity>
              </View>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 12 }}>
                {t.tapToChangePhoto || "Tap to change photo"}
              </Text>
            </View>

            {/* Form Fields */}
            <View style={{ gap: 16 }}>
              {/* Full Name */}
              <View>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: "500", marginBottom: 8 }}>
                  {t.fullName} *
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: errors.fullName ? "#ef4444" : theme.border,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    backgroundColor: theme.background,
                  }}
                >
                  <User size={18} color={theme.textMuted} />
                  <TextInput
                    ref={fullNameRef}
                    style={{
                      flex: 1,
                      padding: 14,
                      color: theme.text,
                      fontSize: 15,
                      marginLeft: 8,
                    }}
                    placeholder={t.enterYourFullName}
                    placeholderTextColor={theme.textMuted}
                    value={formData.fullName}
                    onChangeText={(value) => updateFormData("fullName", value)}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
                {errors.fullName && (
                  <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
                    {errors.fullName}
                  </Text>
                )}
              </View>

              {/* Email (Read-only) */}
              <View>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: "500", marginBottom: 8 }}>
                  {t.emailAddress}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    backgroundColor: theme.cardBackground,
                    opacity: 0.6,
                  }}
                >
                  <Mail size={18} color={theme.textMuted} />
                  <TextInput
                    ref={emailRef}
                    style={{
                      flex: 1,
                      padding: 14,
                      color: theme.textSecondary,
                      fontSize: 15,
                      marginLeft: 8,
                    }}
                    value={formData.email}
                    editable={false}
                  />
                </View>
                <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
                  Email cannot be changed
                </Text>
              </View>

              {/* Phone Number */}
              <View>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: "500", marginBottom: 8 }}>
                  {t.phoneNumber} *
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: errors.phone ? "#ef4444" : theme.border,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    backgroundColor: theme.background,
                  }}
                >
                  <Phone size={18} color={theme.textMuted} />
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginLeft: 8,
                      paddingRight: 8,
                      borderRightWidth: 1,
                      borderRightColor: theme.border,
                    }}
                  >
                    <Text style={{ color: theme.text, fontSize: 15, fontWeight: "500" }}>
                      +252
                    </Text>
                  </View>
                  <TextInput
                    ref={phoneRef}
                    style={{
                      flex: 1,
                      padding: 14,
                      color: theme.text,
                      fontSize: 15,
                      paddingLeft: 12,
                    }}
                    placeholder="61 234 5678"
                    placeholderTextColor={theme.textMuted}
                    value={formData.phone.startsWith('+252') ? formData.phone.substring(4).trim() : formData.phone}
                    onChangeText={(value) => {
                      // Automatically add +252 prefix
                      const cleanValue = value.replace(/[^\d\s]/g, '');
                      updateFormData("phone", `+252 ${cleanValue}`);
                    }}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                  />
                </View>
                {errors.phone ? (
                  <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
                    {errors.phone}
                  </Text>
                ) : (
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
                    Somalia country code (+252) included
                  </Text>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
