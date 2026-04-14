import { useState, useEffect, useRef, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  X,
  Camera,
  User,
  Mail,
  Phone,
  Check,
  ArrowLeft,
} from "lucide-react-native";
import { supabase, getCurrentUserOfflineFirst, updateProfileLocal, isOfflineGateLocked, triggerSync } from "~/lib";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { useTheme, useScreenStatusBar } from "~/lib";
import { useLanguage } from "~/lib";
import { saveLocalImageToCache, cacheImage } from "~/lib/utils/imageCache";
import { enqueueProfileImage } from "~/storage/profileImageQueue";
import { v4 as uuidv4 } from "uuid";
import { CachedImage } from "~/components/CachedImage";

type InputFieldProps = {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  hint?: string;
  keyboardType?: "default" | "phone-pad" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  inputRef?: React.RefObject<TextInput | null>;
  prefix?: string;
  theme: any;
};

const InputField = memo(({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  error,
  disabled,
  hint,
  keyboardType,
  autoCapitalize,
  inputRef,
  prefix,
  theme,
}: InputFieldProps) => (
  <View style={{ marginBottom: 20 }}>
    <Text style={{ 
      color: theme.text, 
      fontSize: 14, 
      fontWeight: "600", 
      marginBottom: 10,
      marginLeft: 4,
    }}>
      {label}
    </Text>
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 2,
        borderColor: error ? "#ef4444" : disabled ? theme.border : theme.border,
        borderRadius: 16,
        paddingHorizontal: 16,
        backgroundColor: disabled ? theme.cardBackground : theme.background,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <View style={{ 
        width: 40, 
        height: 40, 
        borderRadius: 10, 
        backgroundColor: error ? "#ef444415" : theme.primary + "15",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
      }}>
        {icon}
      </View>
      {prefix && (
        <View
          style={{
            paddingRight: 12,
            marginRight: 12,
            borderRightWidth: 1.5,
            borderRightColor: theme.border,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>
            {prefix}
          </Text>
        </View>
      )}
      <TextInput
        ref={inputRef}
        style={{
          flex: 1,
          paddingVertical: 16,
          color: disabled ? theme.textSecondary : theme.text,
          fontSize: 16,
        }}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
    {error ? (
      <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 6, marginLeft: 4 }}>
        {error}
      </Text>
    ) : hint ? (
      <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 6, marginLeft: 4 }}>
        {hint}
      </Text>
    ) : null}
  </View>
));

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
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fullNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const theme = useTheme();
  useScreenStatusBar();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUserOfflineFirst();
        if (user) {
          setCurrentUserId(user.id);
          // If email from params is empty but user has email, update it
          if (!formData.email && user.email) {
            setFormData((prev) => ({ ...prev, email: user.email || prev.email }));
          }
          return;
        }
        const offline = await isOfflineGateLocked();
        if (offline) {
          Alert.alert(
            t.error,
            t.cantVerifySignInOffline ?? "Can't verify sign-in while offline. Please connect to the internet and try again.",
            [{ text: t.ok ?? "OK", onPress: () => router.back() }]
          );
        } else {
          Alert.alert(t.error, t.youNeedToBeLoggedIn);
          router.back();
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        const offline = await isOfflineGateLocked();
        Alert.alert(
          t.error,
          offline
            ? (t.cantVerifySignInOffline ?? "Can't verify sign-in while offline. Please connect to the internet and try again.")
            : t.failedToFetchUser,
          [{ text: t.ok ?? "OK", onPress: () => router.back() }]
        );
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
    if (formData.phone.trim() && !phoneRegex.test(formData.phone)) {
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

    setIsSaving(true);
    try {
      console.log("[UpdateProfile] Saving profile with image_url:", formData.image_url, "-> converted to:", formData.image_url || null);
      updateProfileLocal(currentUserId, {
        full_name: formData.fullName,
        phone: formData.phone,
        image_url: formData.image_url || null,
      });
      if (!(await isOfflineGateLocked())) void triggerSync();

      Alert.alert(t.success, t.profileUpdatedSuccessfully, [
        {
          text: t.ok,
          onPress: () =>
            router.replace({
              pathname: "../(main)/SettingScreen",
              params: {
                updated: "true",
                timestamp: Date.now().toString(),
              },
            }),
        },
      ]);
    } catch (error: any) {
      console.error("Update error:", error);
      Alert.alert(t.error, error.message || t.failedToUpdateProfile);
    } finally {
      setIsSaving(false);
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

  const uploadImage = async (base64Data: string, localUri: string): Promise<string | null> => {
    if (!currentUserId) return null;
    
    setIsUploading(true);
    try {
      const isOffline = await isOfflineGateLocked();
      
      if (isOffline) {
        // Save locally and queue for upload when online
        const cachedPath = await saveLocalImageToCache(localUri, currentUserId);
        
        // Queue for upload when online
        await enqueueProfileImage({
          id: uuidv4(),
          user_id: currentUserId,
          profileId: currentUserId,
          localUri: cachedPath,
          mimeType: "image/jpeg",
        });
        
        // Return local path for immediate display
        return cachedPath;
      }
      
      // Online: upload directly
      const fileName = `profile_${currentUserId}_${Date.now()}.jpg`;
      const filePath = `profile_images/${fileName}`;

      const { data, error } = await supabase.storage
        .from("images")
        .upload(filePath, decode(base64Data), {
          contentType: "image/jpeg",
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(filePath);

      // Cache the uploaded image for offline viewing
      cacheImage(publicUrl).catch(() => {});

      return publicUrl;
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert(t.error, error.message || t.failedToUploadImage);
      return null;
    } finally {
      setIsUploading(false);
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
        onPress: () => {
          setFormData((prev) => ({ ...prev, image_url: "" }));
          setHasChanges(true);
        },
      },
    ]);
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(t.error, t.permissionToAccessCamera || "Camera permission is required");
          return;
        }
      }

      if (useCamera) {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });
        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          const imageUri = await uploadImage(asset.base64 || "", asset.uri);
          if (imageUri) {
            updateFormData("image_url", imageUri);
          }
        }
      } else {
        // Use system picker (no broad media permissions required)
        const picked = await DocumentPicker.getDocumentAsync({
          type: ["image/*"],
          multiple: false,
          copyToCacheDirectory: true,
        });
        if (picked.canceled) return;
        const asset = (picked as any).assets?.[0];
        const uri: string | undefined = asset?.uri ?? (picked as any).uri;
        if (!uri) return;
        const base64Encoding: any =
          (FileSystem as any).EncodingType?.Base64 ?? "base64";
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: base64Encoding,
        });
        const imageUri = await uploadImage(base64, uri);
        if (imageUri) updateFormData("image_url", imageUri);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert(t.error, t.failedToPickImage);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
        >
          <TouchableOpacity
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: theme.cardBackground,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: theme.border,
            }}
            onPress={handleCancel}
          >
            <ArrowLeft size={22} color={theme.text} />
          </TouchableOpacity>
          
          <Text style={{ 
            color: theme.text, 
            fontSize: 18, 
            fontWeight: "700",
            flex: 1,
            textAlign: "center",
            marginRight: 44,
          }}>
            {t.updateProfile || "Edit Profile"}
          </Text>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Profile Photo Section */}
          <View style={{ 
            alignItems: "center", 
            paddingVertical: 32,
            paddingHorizontal: 20,
          }}>
            <View style={{ position: "relative" }}>
              {isUploading && (
                <View style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  borderRadius: 60,
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 10,
                }}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}
              {formData.image_url ? (
                <CachedImage
                  uri={formData.image_url}
                  fallbackName={formData.fullName}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    borderWidth: 4,
                    borderColor: theme.primary + "40",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: theme.primary + "15",
                    borderWidth: 4,
                    borderColor: theme.primary + "30",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <User size={48} color={theme.primary} />
                </View>
              )}
              <TouchableOpacity
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.primary,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 4,
                  borderColor: theme.background,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}
                onPress={handleChangePhoto}
                disabled={isUploading}
              >
                <Camera size={18} color={theme.primaryText} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              onPress={handleChangePhoto}
              disabled={isUploading}
              style={{ marginTop: 16 }}
            >
              <Text style={{ 
                color: theme.primary, 
                fontSize: 15, 
                fontWeight: "600",
              }}>
                {t.changePhoto || "Change Photo"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={{ paddingHorizontal: 20 }}>
            {/* Section Header */}
            <Text style={{ 
              color: theme.text, 
              fontSize: 16, 
              fontWeight: "700",
              marginBottom: 20,
            }}>
              {t.personalInformation || "Personal Information"}
            </Text>

            <InputField
              label={`${t.fullName} *`}
              icon={<User size={20} color={errors.fullName ? "#ef4444" : theme.primary} />}
              value={formData.fullName}
              onChangeText={(value) => updateFormData("fullName", value)}
              placeholder={t.enterYourFullName}
              error={errors.fullName}
              autoCapitalize="words"
              inputRef={fullNameRef}
              theme={theme}
            />

            <InputField
              label={t.emailAddress}
              icon={<Mail size={20} color={theme.primary} />}
              value={formData.email}
              disabled
              hint={t.emailCannotBeChanged || "Email cannot be changed"}
              inputRef={emailRef}
              theme={theme}
            />

            <InputField
              label={t.phoneNumber}
              icon={<Phone size={20} color={errors.phone ? "#ef4444" : theme.primary} />}
              value={formData.phone.startsWith('+252') ? formData.phone.substring(4).trim() : formData.phone}
              onChangeText={(value) => {
                const cleanValue = value.replace(/[^\d\s]/g, '');
                updateFormData("phone", `+252 ${cleanValue}`);
              }}
              placeholder="61 234 5678"
              error={errors.phone}
              hint={!errors.phone ? (t.somaliaCountryCode || "Somalia country code (+252) included") : undefined}
              keyboardType="phone-pad"
              prefix="+252"
              inputRef={phoneRef}
              theme={theme}
            />
          </View>
        </ScrollView>

        {/* Floating Save Button */}
        {hasChanges && (
          <View style={{
            position: "absolute",
            bottom: 24,
            right: 20,
          }}>
            <TouchableOpacity
              style={{
                paddingVertical: 14,
                paddingHorizontal: 24,
                borderRadius: 16,
                backgroundColor: theme.primary,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.primaryText} />
              ) : (
                <>
                  <Check size={20} color={theme.primaryText} />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: theme.primaryText,
                    }}
                  >
                    {t.save}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
