import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Edit3,
  Camera,
  User,
  Key,
  LogOut,
  Check,
  X,
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  Globe,
} from "lucide-react-native";
import { deleteItemAsync } from "expo-secure-store";
import { supabase } from "~/lib";
import { UserProfile } from "~/types/userTypes";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import {
  fetchProfile,
  type Profile,
} from "~/lib";

type PasswordData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [userProfile, setUserProfile] = useState<UserProfile>({
    fullName: "",
    email: "",
    phone: "",
    lastSignIn: "",
    image_url: "",
    joinDate: "",
    totalPredictions: 0,
    avgAccuracy: 0,
  });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const theme = useTheme();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Get the current user session
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Fetch profile data using the service
          const profileData = await fetchProfile(user.id);

          if (profileData) {
            setUserProfile({
              fullName: profileData.full_name || "",
              email: user.email || "",
              phone: profileData.phone || "",
              image_url: profileData.image_url || "",
              totalPredictions: 0,
              avgAccuracy: 0,
              joinDate: profileData.created_at || new Date().toISOString(),
              lastSignIn: user.last_sign_in_at || new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        Alert.alert(t.error, t.failedToFetchProfile);
      }
    };

    fetchUserProfile();
  }, []);

  const handleChangePassword = async () => {
    // Validate empty fields
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      Alert.alert(t.error, t.pleaseFillAllFields);
      return;
    }

    // Validate new password requirements
    const passwordErrors = [];

    if (passwordData.newPassword.length < 8) {
      passwordErrors.push(t.atLeast8Characters);
    }

    if (!/[A-Z]/.test(passwordData.newPassword)) {
      passwordErrors.push(t.oneUppercaseLetter);
    }

    if (!/[0-9]/.test(passwordData.newPassword)) {
      passwordErrors.push(t.oneNumber);
    }

    // Check if password contains only numbers
    if (/^\d+$/.test(passwordData.newPassword)) {
      passwordErrors.push("Cannot contain only numbers");
    }

    // Check if password contains at least one letter
    if (!/[a-zA-Z]/.test(passwordData.newPassword)) {
      passwordErrors.push("At least one letter");
    }

    if (passwordErrors.length > 0) {
      Alert.alert(
        t.passwordRequirementsNotMet,
        `${t.yourPasswordMustContain}\n\n• ${passwordErrors.join("\n• ")}`
      );
      return;
    }

    // Check if new password matches confirmation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert(t.error, t.newPasswordsDontMatch);
      return;
    }

    // Check if new password is same as current
    if (passwordData.newPassword === passwordData.currentPassword) {
      Alert.alert(t.error, t.newPasswordMustBeDifferent);
      return;
    }

    try {
      // First verify the current password by signing in again
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        throw new Error(t.currentPasswordIncorrect);
      }

      // If current password is correct, update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) throw updateError;

      Alert.alert(t.success, t.passwordUpdatedSuccessfully);
      setShowChangePassword(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Password change error:", error);
      Alert.alert(t.error, error.message || t.failedToUpdatePassword);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      await deleteItemAsync("token");
      await deleteItemAsync("refresh_token");

      router.replace("../(onboarding)/welcomeScreen" as any);

      return true;
    } catch (err) {
      console.error("Logout error:", err);
      return false;
    }
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: theme.background }}
    >
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text style={{ color: theme.text, fontSize: 24, fontWeight: "bold" }}>
                {t.settings}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 4 }}>
                Manage your account
              </Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: theme.cardBackground,
                padding: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() =>
                router.push({
                  pathname: "../(profile)/UpdateProfileScreen" as any,
                  params: { userProfile: JSON.stringify(userProfile) },
                })
              }
            >
              <Edit3 size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* Profile Card - Simplified */}
          <View
            style={{
              backgroundColor: theme.cardBackground,
              padding: 20,
              borderRadius: 16,
              marginBottom: 24,
              alignItems: "center",
            }}
          >
            <View className="relative mb-4">
              <Image
                source={{
                  uri:
                    userProfile.image_url ||
                    "https://ui-avatars.com/api/?name=" +
                      encodeURIComponent(userProfile.fullName || "User"),
                }}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  borderWidth: 3,
                  borderColor: theme.primary,
                }}
              />
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
                  borderColor: theme.cardBackground,
                }}
                onPress={() =>
                  router.push({
                    pathname: "../(profile)/UpdateProfileScreen" as any,
                    params: {
                      userProfile: JSON.stringify(userProfile),
                      focusField: "image_url",
                    },
                  })
                }
              >
                <Camera size={14} color={theme.primaryText} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: theme.text, fontSize: 20, fontWeight: "bold", marginBottom: 4 }}>
              {userProfile.fullName || t.noNameProvided}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
              {userProfile.email}
            </Text>
          </View>

          {/* Quick Actions */}
          <View style={{ gap: 12, marginBottom: 24 }}>
            {/* Language */}
            <TouchableOpacity
              style={{
                backgroundColor: theme.cardBackground,
                padding: 16,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
              }}
              onPress={() => setShowLanguageModal(true)}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#dcfce7',
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <Globe size={20} color="#16a34a" />
              </View>
              <View className="flex-1">
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>
                  {t.languages || "Language"}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>
                  {language === "en" ? "English" : "Soomaali"}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Change Password */}
            <TouchableOpacity
              style={{
                backgroundColor: theme.cardBackground,
                padding: 16,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
              }}
              onPress={() => setShowChangePassword(true)}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#dbeafe',
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <Key size={20} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>
                  {t.changePassword}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>
                  {t.updateAccountPassword || "Update your password"}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Profile Info */}
            <TouchableOpacity
              style={{
                backgroundColor: theme.cardBackground,
                padding: 16,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
              }}
              onPress={() =>
                router.push({
                  pathname: "../(profile)/UpdateProfileScreen" as any,
                  params: { userProfile: JSON.stringify(userProfile) },
                })
              }
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#fef3c7',
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <User size={20} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>
                  {t.contactInformation || "Contact Info"}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>
                  {userProfile.phone || t.noPhoneProvided}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Sign Out */}
          <TouchableOpacity
            style={{
              backgroundColor: '#fee2e2',
              padding: 16,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handleLogout}
          >
            <LogOut size={20} color="#dc2626" />
            <Text style={{ color: "#dc2626", fontSize: 16, fontWeight: "600", marginLeft: 8 }}>
              {t.signOut}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Password Change Modal - Simplified */}
      <Modal
        visible={showChangePassword}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowChangePassword(false)}
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", padding: 16 }}>
          <View
            style={{
              width: "100%",
              maxWidth: 400,
              backgroundColor: theme.cardBackground,
              borderRadius: 20,
              padding: 20,
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View className="flex-row justify-between items-center mb-5">
                <Text style={{ color: theme.text, fontSize: 22, fontWeight: "bold" }}>
                  {t.changePassword}
                </Text>
                <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                  <X size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Current Password */}
              <View className="mb-4">
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: "500", marginBottom: 8 }}>
                  {t.currentPassword} *
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    backgroundColor: theme.background,
                  }}
                >
                  <Lock size={18} color={theme.textMuted} />
                  <TextInput
                    style={{ flex: 1, padding: 14, color: theme.text, fontSize: 15, marginLeft: 8 }}
                    placeholder={t.enterCurrentPassword}
                    placeholderTextColor={theme.textMuted}
                    value={passwordData.currentPassword}
                    onChangeText={(value) =>
                      setPasswordData((prev) => ({ ...prev, currentPassword: value }))
                    }
                    secureTextEntry={!showPassword.current}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setShowPassword((prev) => ({ ...prev, current: !prev.current }))
                    }
                  >
                    {showPassword.current ? (
                      <EyeOff size={18} color={theme.textMuted} />
                    ) : (
                      <Eye size={18} color={theme.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password */}
              <View className="mb-4">
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: "500", marginBottom: 8 }}>
                  {t.newPassword} *
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    backgroundColor: theme.background,
                  }}
                >
                  <Lock size={18} color={theme.textMuted} />
                  <TextInput
                    style={{ flex: 1, padding: 14, color: theme.text, fontSize: 15, marginLeft: 8 }}
                    placeholder={t.enterNewPassword}
                    placeholderTextColor={theme.textMuted}
                    value={passwordData.newPassword}
                    onChangeText={(value) =>
                      setPasswordData((prev) => ({ ...prev, newPassword: value }))
                    }
                    secureTextEntry={!showPassword.new}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setShowPassword((prev) => ({ ...prev, new: !prev.new }))
                    }
                  >
                    {showPassword.new ? (
                      <EyeOff size={18} color={theme.textMuted} />
                    ) : (
                      <Eye size={18} color={theme.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View className="mb-4">
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: "500", marginBottom: 8 }}>
                  {t.confirmNewPassword} *
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    backgroundColor: theme.background,
                  }}
                >
                  <Lock size={18} color={theme.textMuted} />
                  <TextInput
                    style={{ flex: 1, padding: 14, color: theme.text, fontSize: 15, marginLeft: 8 }}
                    placeholder={t.confirmNewPasswordPlaceholder}
                    placeholderTextColor={theme.textMuted}
                    value={passwordData.confirmPassword}
                    onChangeText={(value) =>
                      setPasswordData((prev) => ({ ...prev, confirmPassword: value }))
                    }
                    secureTextEntry={!showPassword.confirm}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setShowPassword((prev) => ({ ...prev, confirm: !prev.confirm }))
                    }
                  >
                    {showPassword.confirm ? (
                      <EyeOff size={18} color={theme.textMuted} />
                    ) : (
                      <Eye size={18} color={theme.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Requirements */}
              <View
                style={{
                  backgroundColor: `${theme.primary}10`,
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 12, fontWeight: "600", marginBottom: 8 }}>
                  {t.passwordRequirements}
                </Text>
                <View style={{ gap: 6 }}>
                  <View className="flex-row items-center">
                    <Check
                      size={14}
                      color={passwordData.newPassword.length >= 8 ? "#10b981" : "#ef4444"}
                    />
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 6 }}>
                      {t.atLeast8Characters}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Check
                      size={14}
                      color={/[A-Z]/.test(passwordData.newPassword) ? "#10b981" : "#ef4444"}
                    />
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 6 }}>
                      {t.oneUppercaseLetter}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Check
                      size={14}
                      color={/[0-9]/.test(passwordData.newPassword) ? "#10b981" : "#ef4444"}
                    />
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 6 }}>
                      {t.oneNumber}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                onPress={handleChangePassword}
              >
                <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: "600" }}>
                  {t.updatePassword}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Language Change Modal - Simplified */}
      <Modal
        visible={showLanguageModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", padding: 16 }}>
          <View
            style={{
              width: "100%",
              maxWidth: 360,
              backgroundColor: theme.cardBackground,
              borderRadius: 20,
              padding: 20,
            }}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center mb-5">
              <Text style={{ color: theme.text, fontSize: 22, fontWeight: "bold" }}>
                {t.languages || "Language"}
              </Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <X size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Language Options */}
            <View style={{ gap: 12 }}>
              {/* English */}
              <TouchableOpacity
                style={{
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: language === "en" ? theme.primary : theme.border,
                  backgroundColor: language === "en" ? `${theme.primary}10` : theme.background,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onPress={() => {
                  setLanguage("en");
                  setShowLanguageModal(false);
                }}
              >
                <View className="flex-1">
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>
                    English
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>
                    English language
                  </Text>
                </View>
                {language === "en" && (
                  <View style={{ backgroundColor: '#dcfce7', borderRadius: 12, padding: 4 }}>
                    <Check size={18} color="#16a34a" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Somali */}
              <TouchableOpacity
                style={{
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: language === "so" ? theme.primary : theme.border,
                  backgroundColor: language === "so" ? `${theme.primary}10` : theme.background,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onPress={() => {
                  setLanguage("so");
                  setShowLanguageModal(false);
                }}
              >
                <View className="flex-1">
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>
                    Soomaali
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>
                    Somali language
                  </Text>
                </View>
                {language === "so" && (
                  <View style={{ backgroundColor: '#dcfce7', borderRadius: 12, padding: 4 }}>
                    <Check size={18} color="#16a34a" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
