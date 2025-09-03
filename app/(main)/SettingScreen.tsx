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
  Clock,
  Calendar,
  Target,
  UserCheck,
  User,
  Phone,
  Mail,
  Key,
  Smartphone,
  Shield,
  AlertTriangle,
  Trash2,
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
  updateProfile,
  updateProfileName,
  updateProfilePhone,
  updateProfileEmail,
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
    image_url: "",
  });
  const [loading, setLoading] = useState(true);
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
        setLoading(true);

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
            });
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        Alert.alert(t.error, t.failedToFetchProfile);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleUpdateProfile = async (updates: Partial<Profile>) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      const updatedProfile = await updateProfile(user.id, updates);

      // Update local state
      setUserProfile((prev) => ({
        ...prev,
        fullName: updatedProfile.full_name || prev.fullName,
        phone: updatedProfile.phone || prev.phone,
        image_url: updatedProfile.image_url || prev.image_url,
      }));

      Alert.alert(t.success, t.profileUpdatedSuccessfully);
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert(t.error, t.failedToUpdateProfile);
    }
  };

  const handleUpdateName = async (newName: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(t.error, t.userNotAuthenticated);
        return;
      }

      await updateProfileName(user.id, newName);
      setUserProfile((prev) => ({ ...prev, fullName: newName }));
      Alert.alert(t.success, t.nameUpdatedSuccessfully);
    } catch (error) {
      console.error("Error updating name:", error);
      Alert.alert(t.error, t.failedToUpdateName);
    }
  };

  const handleUpdatePhone = async (newPhone: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(t.error, t.userNotAuthenticated);
        return;
      }

      await updateProfilePhone(user.id, newPhone);
      setUserProfile((prev) => ({ ...prev, phone: newPhone }));
      Alert.alert(t.success, t.phoneUpdatedSuccessfully);
    } catch (error) {
      console.error("Error updating phone:", error);
      Alert.alert(t.error, t.failedToUpdatePhone);
    }
  };

  const handleUpdateEmail = async (newEmail: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(t.error, t.userNotAuthenticated);
        return;
      }

      await updateProfileEmail(user.id, newEmail);
      setUserProfile((prev) => ({ ...prev, email: newEmail }));
      Alert.alert(t.success, t.emailUpdatedSuccessfully);
    } catch (error) {
      console.error("Error updating email:", error);
      Alert.alert(t.error, t.failedToUpdateEmail);
    }
  };

  const formatLastSignIn = (dateString?: string) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
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
      setLoading(true);

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
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      await deleteItemAsync("token");
      await deleteItemAsync("userId");
      await deleteItemAsync("refresh_token");
      await deleteItemAsync("supabase_session");

      router.replace("../(onboarding)/welcomeScreen" as any);

      return true;
    } catch (err) {
      console.error("Logout error:", err);
      return false;
    }
  };

  return (
    <SafeAreaView
      className="flex-1 "
      style={{ backgroundColor: theme.background }}
    >
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-5">
          <Text
            style={{
              color: theme.text,
            }}
            className=" text-2xl font-bold"
          >
            {t.settings}
          </Text>
          <TouchableOpacity
            className="p-2"
            onPress={() =>
              router.push({
                pathname: "../(profile)/UpdateProfileScreen" as any,
                params: { userProfile: JSON.stringify(userProfile) },
              })
            }
          >
            <Edit3 size={20} color={theme.icon} />
          </TouchableOpacity>
        </View>

        {/* Profile Image & Basic Info */}
        <View className="items-center px-6 pb-8">
          <View className="relative mb-4">
            <Image
              source={{
                uri:
                  userProfile.image_url ||
                  "https://ui-avatars.com/api/?name=" +
                    encodeURIComponent(userProfile.fullName || "User"),
              }}
              className="w-32 h-32 rounded-full border-4 border-emerald-500"
              style={{
                borderColor: theme.border,
              }}
            />
            <TouchableOpacity
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full  justify-center items-center border-[3px] "
              style={{
                backgroundColor: theme.primary,
                borderColor: theme.border,
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
              <Camera size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View className="items-center">
            <Text
              style={{
                color: theme.text,
              }}
              className=" text-2xl font-bold mb-1"
            >
              {loading ? t.loading : userProfile.fullName || t.noNameProvided}
            </Text>
            <Text className="text-emerald-500 text-base mb-2">
              {loading ? t.loading : userProfile.email}
            </Text>
          </View>
        </View>

        {/* Contact Information */}
        <View className="px-6 mb-8">
          <Text
            style={{
              color: theme.text,
            }}
            className=" text-lg font-bold mb-4"
          >
            {t.contactInformation}
          </Text>

          <View
            className=" rounded-xl border  overflow-hidden"
            style={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            }}
          >
            {/* Full Name */}
            <View className="flex-row items-center p-4">
              <User size={20} color="#64748b" />
              <View className="ml-4 flex-1">
                <Text className="text-slate-400 text-xs mb-1">
                  {t.fullName}
                </Text>
                <Text
                  style={{
                    color: theme.text,
                  }}
                  className="text-base font-medium"
                >
                  {loading
                    ? t.loading
                    : userProfile.fullName || t.noNameProvided}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-[#3b82f6] " />

            {/* Phone Number */}
            <View className="flex-row items-center p-4">
              <Phone size={20} color="#64748b" />
              <View className="ml-4 flex-1">
                <Text className="text-slate-400 text-xs mb-1">
                  {t.phoneNumber}
                </Text>
                <Text
                  style={{
                    color: theme.text,
                  }}
                  className=" text-base font-medium"
                >
                  {loading ? t.loading : userProfile.phone || t.noPhoneProvided}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-[#3b82f6] " />

            {/* Email */}
            <View className="flex-row items-center p-4">
              <Mail size={20} color="#64748b" />
              <View className="ml-4 flex-1">
                <Text className="text-slate-400 text-xs mb-1">
                  {t.emailAddress}
                </Text>
                <Text
                  style={{
                    color: theme.text,
                  }}
                  className=" text-base font-medium"
                >
                  {loading ? t.loading : userProfile.email || t.noPhoneProvided}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Language Section */}
        <View className="px-6 mb-8">
          <Text
            style={{ color: theme.text }}
            className="text-lg font-bold mb-4"
          >
            {t.languages}
          </Text>

          {/* Change Language */}
          <TouchableOpacity
            className="flex-row items-center  rounded-xl p-4 mb-3 border "
            onPress={() => setShowLanguageModal(true)}
            style={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            }}
          >
            <View
              className="w-10 h-10 rounded-full  justify-center items-center mr-4"
              style={{ backgroundColor: theme.cardBackground }}
            >
              <Globe size={20} color="#10b981" />
            </View>
            <View className="flex-1">
              <Text
                style={{ color: theme.text }}
                className=" text-base font-semibold mb-1"
              >
                {t.languages}
              </Text>
              <Text className="text-slate-400 text-sm">
                Change your app language
              </Text>
            </View>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Security Section */}
        <View className="px-6 mb-8">
          <Text
            style={{ color: theme.text }}
            className="text-lg font-bold mb-4"
          >
            {t.security}
          </Text>

          {/* Change Password */}
          <TouchableOpacity
            className="flex-row items-center  rounded-xl p-4 mb-3 border "
            onPress={() => setShowChangePassword(true)}
            style={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            }}
          >
            <View
              className="w-10 h-10 rounded-full  justify-center items-center mr-4"
              style={{ backgroundColor: theme.cardBackground }}
            >
              <Key size={20} color="#10b981" />
            </View>
            <View className="flex-1">
              <Text
                style={{ color: theme.text }}
                className=" text-base font-semibold mb-1"
              >
                {t.changePassword}
              </Text>
              <Text className="text-slate-400 text-sm">
                {t.updateAccountPassword}
              </Text>
            </View>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          className="flex-row items-center justify-center mx-6 mb-8 py-4 rounded-xl border border-red-500"
          onPress={handleLogout}
        >
          <LogOut size={20} color="#ef4444" />

          <Text className="text-red-500 text-base font-light ml-2">
            {t.signOut}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showChangePassword}
        animationType="slide"
        onRequestClose={() => setShowChangePassword(false)}
      >
        <SafeAreaView
          className="flex-1 "
          style={{ backgroundColor: theme.background }}
        >
          {/* Modal Header */}
          <View
            className="flex-row justify-between items-center px-6 py-4 border-b "
            style={{ borderBottomColor: theme.border }}
          >
            <Text style={{ color: theme.text }} className="text-xl font-bold">
              {t.changePassword}
            </Text>
            <TouchableOpacity
              className="p-2"
              onPress={() => setShowChangePassword(false)}
            >
              <X size={24} color={theme.icon} />
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView className="flex-1 px-6">
            <View className="py-6">
              {/* Current Password */}
              <View className="mb-5">
                <Text
                  style={{ color: theme.text }}
                  className=" text-sm font-semibold mb-2"
                >
                  {t.currentPassword}
                </Text>
                <View
                  className="flex-row items-center  rounded-xl border  px-4"
                  style={{
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                  }}
                >
                  <Lock size={20} color="#64748b" className="mr-3" />
                  <TextInput
                    className="flex-1 py-4 text-white text-base"
                    placeholder={t.enterCurrentPassword}
                    placeholderTextColor="#64748b"
                    value={passwordData.currentPassword}
                    onChangeText={(value) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        currentPassword: value,
                      }))
                    }
                    secureTextEntry={!showPassword.current}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        current: !prev.current,
                      }))
                    }
                  >
                    {showPassword.current ? (
                      <EyeOff size={20} color="#64748b" />
                    ) : (
                      <Eye size={20} color="#64748b" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password */}
              <View className="mb-5">
                <Text
                  style={{ color: theme.text }}
                  className=" text-sm font-semibold mb-2"
                >
                  {t.newPassword}
                </Text>
                <View
                  className="flex-row items-center  rounded-xl border  px-4"
                  style={{
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                  }}
                >
                  <TextInput
                    className="flex-1 py-4 text-white text-base"
                    placeholder={t.enterNewPassword}
                    placeholderTextColor="#64748b"
                    value={passwordData.newPassword}
                    onChangeText={(value) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        newPassword: value,
                      }))
                    }
                    secureTextEntry={!showPassword.new}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setShowPassword((prev) => ({ ...prev, new: !prev.new }))
                    }
                  >
                    {showPassword.new ? (
                      <EyeOff size={20} color="#64748b" />
                    ) : (
                      <Eye size={20} color="#64748b" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View className="mb-5">
                <Text
                  style={{ color: theme.text }}
                  className=" text-sm font-semibold mb-2"
                >
                  {t.confirmNewPassword}
                </Text>
                <View
                  className="flex-row items-center  rounded-xl border  px-4"
                  style={{
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                  }}
                >
                  <Lock size={20} color="#64748b" className="mr-3" />
                  <TextInput
                    className="flex-1 py-4 text-white text-base"
                    placeholder={t.confirmNewPasswordPlaceholder}
                    placeholderTextColor="#64748b"
                    value={passwordData.confirmPassword}
                    onChangeText={(value) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        confirmPassword: value,
                      }))
                    }
                    secureTextEntry={!showPassword.confirm}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        confirm: !prev.confirm,
                      }))
                    }
                  >
                    {showPassword.confirm ? (
                      <EyeOff size={20} color="#64748b" />
                    ) : (
                      <Eye size={20} color="#64748b" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Requirements */}
              <View
                className=" rounded-lg p-4 border  mb-6"
                style={{
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                }}
              >
                <Text
                  style={{
                    color: theme.text,
                  }}
                  className=" text-xs font-medium mb-2"
                >
                  {t.passwordRequirements}
                </Text>

                <View className="flex-row items-center mb-1">
                  <Check
                    size={14}
                    color={
                      passwordData.newPassword.length >= 8
                        ? "#10b981"
                        : "#ef4444"
                    }
                  />
                  <Text
                    style={{
                      color: theme.textSecondary,
                    }}
                    className=" text-xs ml-2"
                  >
                    {t.atLeast8Characters}
                  </Text>
                </View>

                <View className="flex-row items-center mb-1">
                  <Check
                    size={14}
                    color={
                      /[A-Z]/.test(passwordData.newPassword)
                        ? "#10b981"
                        : "#ef4444"
                    }
                  />
                  <Text
                    style={{
                      color: theme.textSecondary,
                    }}
                    className="text-xs ml-2"
                  >
                    {t.oneUppercaseLetter}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Check
                    size={14}
                    color={
                      /[0-9]/.test(passwordData.newPassword)
                        ? "#10b981"
                        : "#ef4444"
                    }
                  />
                  <Text
                    style={{
                      color: theme.textSecondary,
                    }}
                    className=" text-xs ml-2"
                  >
                    {t.oneNumber}
                  </Text>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                className="bg-emerald-500 py-4 rounded-xl items-center"
                onPress={handleChangePassword}
                disabled={loading}
              >
                <Text className="text-white text-base font-bold">
                  {loading ? t.updating : t.updatePassword}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Language Change Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View
            style={{
              width: "90%",
              maxHeight: "70%",
              backgroundColor: theme.cardBackground,
              borderRadius: 12,
              padding: 20,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            {/* Modal Header */}
            <View
              className="flex-row justify-between items-center px-6 py-4 border-b"
              style={{ borderBottomColor: theme.border }}
            >
              <Text style={{ color: theme.text }} className="text-lg font-bold">
                {t.languages}
              </Text>
              <TouchableOpacity
                className="p-2"
                onPress={() => setShowLanguageModal(false)}
              >
                <X size={20} color={theme.icon} />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <View className="p-6">
              {/* Language Options */}
              <View>
                <Text
                  style={{ color: theme.text }}
                  className="text-base font-semibold mb-4"
                >
                  Select Language
                </Text>

                {/* English Option */}
                <TouchableOpacity
                  className="flex-row items-center p-4 rounded-xl border mb-3"
                  style={{
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                  }}
                  onPress={() => {
                    setLanguage("en");
                    setShowLanguageModal(false);
                  }}
                >
                  <View className="flex-1">
                    <Text
                      style={{ color: theme.text }}
                      className="text-base font-semibold"
                    >
                      English
                    </Text>
                    <Text className="text-slate-400 text-sm">
                      English language
                    </Text>
                  </View>
                  {language === "en" && <Check size={20} color="#10b981" />}
                </TouchableOpacity>

                {/* Somali Option */}
                <TouchableOpacity
                  className="flex-row items-center p-4 rounded-xl border"
                  style={{
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                  }}
                  onPress={() => {
                    setLanguage("so");
                    setShowLanguageModal(false);
                  }}
                >
                  <View className="flex-1">
                    <Text
                      style={{ color: theme.text }}
                      className="text-base font-semibold"
                    >
                      Soomaali
                    </Text>
                    <Text className="text-slate-400 text-sm">
                      Somali language
                    </Text>
                  </View>
                  {language === "so" && <Check size={20} color="#10b981" />}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
