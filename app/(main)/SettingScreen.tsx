import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
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
  Shield,
  Bell,
  Smartphone,
  HelpCircle,
  Info,
} from "lucide-react-native";
import { deleteItemAsync } from "expo-secure-store";
import { supabase, getCurrentUserOfflineFirst } from "~/lib";
import { UserProfile } from "~/types/userTypes";
import { useTheme, useScreenStatusBar } from "~/lib";
import { useLanguage } from "~/lib";
import {
  fetchProfile,
  selectProfile,
  useSyncStatus,
  type Profile,
} from "~/lib";
import { SyncStatusIndicator } from "~/components/SyncStatusIndicator";
import { retryFailedSync } from "~/lib/sync/legendSync";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";
import { CachedImage } from "~/components/CachedImage";
import { cacheImage } from "~/lib/utils/imageCache";

type PasswordData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t, language, setLanguage } = useLanguage();
  const syncState = useSyncStatus();
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
  useScreenStatusBar();

  const fetchUserProfile = useCallback(async () => {
    try {
      const user = await getCurrentUserOfflineFirst();
      if (user) {
        // Check local profile first - this is the source of truth for local changes
        const localProfile = selectProfile(user.id);
        
        if (localProfile) {
          console.log("[Settings] Local profile found, full_name:", localProfile.full_name, "status:", localProfile.__local_status);
          // Use local profile data
          setUserProfile({
            fullName: localProfile.full_name || "",
            email: user.email || localProfile.email || "",
            phone: localProfile.phone || "",
            image_url: localProfile.image_url ?? "",
            totalPredictions: 0,
            avgAccuracy: 0,
            joinDate: localProfile.created_at || new Date().toISOString(),
            lastSignIn: user.last_sign_in_at || new Date().toISOString(),
          });
          
          // Cache profile image for offline use (only if there's actually an image)
          if (localProfile.image_url) {
            cacheImage(localProfile.image_url).catch(() => {});
          }
          
          // If local profile is pending sync, don't overwrite with server data
          if (localProfile.__local_status === "pending") {
            return;
          }
        }

        // Fetch from server only if no local pending changes
        try {
          const profileData = await fetchProfile(user.id);
          if (profileData) {
            // Re-check local profile to make sure user hasn't made changes while fetching
            const freshLocalProfile = selectProfile(user.id);
            if (freshLocalProfile?.__local_status === "pending") {
              return; // Don't overwrite pending local changes
            }
            
            setUserProfile({
              fullName: profileData.full_name || "",
              email: user.email || "",
              phone: profileData.phone || "",
              image_url: profileData.image_url ?? "",
              totalPredictions: 0,
              avgAccuracy: 0,
              joinDate: profileData.created_at || new Date().toISOString(),
              lastSignIn: user.last_sign_in_at || new Date().toISOString(),
            });
            
            if (profileData.image_url) {
              cacheImage(profileData.image_url).catch(() => {});
            }
          }
        } catch {
          // Ignore fetch errors - we already have local data
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert(t.error, t.failedToFetchProfile);
    }
  }, [t]);

  // Fetch profile when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [fetchUserProfile])
  );

  // Also fetch when params change (for backward compatibility)
  useEffect(() => {
    if (params.timestamp) {
      fetchUserProfile();
    }
  }, [params.timestamp, fetchUserProfile]);

  const handleChangePassword = async () => {
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      Alert.alert(t.error, t.pleaseFillAllFields);
      return;
    }

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

    if (/^\d+$/.test(passwordData.newPassword)) {
      passwordErrors.push("Cannot contain only numbers");
    }

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

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert(t.error, t.newPasswordsDontMatch);
      return;
    }

    if (passwordData.newPassword === passwordData.currentPassword) {
      Alert.alert(t.error, t.newPasswordMustBeDifferent);
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        throw new Error(t.currentPasswordIncorrect);
      }

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

      router.replace("../(auth)/login" as any);

      return true;
    } catch (err) {
      console.error("Logout error:", err);
      return false;
    }
  };

  const SettingItem = ({ 
    icon, 
    iconBg, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true,
    rightElement,
  }: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
      }}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: iconBg,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 14,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement}
      {showArrow && onPress && <ChevronRight size={20} color={theme.textMuted} />}
    </TouchableOpacity>
  );

  const Divider = () => (
    <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 74 }} />
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top"]}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={{ paddingBottom: 32 }}>
          {/* Header with gradient background */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 24,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={{ color: theme.text, fontSize: 28, fontWeight: "700", letterSpacing: -0.5 }}>
                  {t.settings}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 4 }}>
                  {t.manageYourAccount || "Manage your account"}
                </Text>
              </View>
            </View>
          </View>

          {/* Profile Card */}
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View
              style={{
                backgroundColor: theme.cardBackground,
                borderRadius: 24,
                padding: 20,
                borderWidth: 1,
                borderColor: theme.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ position: "relative" }}>
                  <CachedImage
                    uri={userProfile.image_url}
                    fallbackName={userProfile.fullName || "User"}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      borderWidth: 3,
                      borderColor: theme.primary + "30",
                    }}
                  />
                  <TouchableOpacity
                    style={{
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
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
                    <Camera size={12} color={theme.primaryText} />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={{ color: theme.text, fontSize: 20, fontWeight: "700" }}>
                    {userProfile.fullName || t.noNameProvided}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 2 }} numberOfLines={1}>
                    {userProfile.email}
                  </Text>
                </View>
                <TouchableOpacity
                  hitSlop={12}
                  onPress={() =>
                    router.push({
                      pathname: "../(profile)/UpdateProfileScreen" as any,
                      params: { userProfile: JSON.stringify(userProfile) },
                    })
                  }
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: theme.primary + "15",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Edit3 size={18} color={theme.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Sync Status Section */}
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 10, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t.syncStatus || "Sync Status"}
            </Text>
            <View
              style={{
                backgroundColor: theme.cardBackground,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                overflow: "hidden",
              }}
            >
              <TouchableOpacity
                activeOpacity={syncState.status === "error" ? 0.7 : 1}
                onPress={() => {
                  if (syncState.status === "error") {
                    retryFailedSync();
                  }
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: syncState.status === "up-to-date" ? "#10b98115" : syncState.status === "error" ? "#ef444415" : "#3b82f615",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 14,
                  }}
                >
                  <Shield size={22} color={syncState.status === "up-to-date" ? "#10b981" : syncState.status === "error" ? "#ef4444" : "#3b82f6"} />
                </View>
                <View style={{ flex: 1 }}>
                  <SyncStatusIndicator />
                  {syncState.pendingCount > 0 && (
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
                      {syncState.pendingCount} {t.pendingChanges || "pending changes"}
                    </Text>
                  )}
                  {syncState.status === "error" && (
                    <Text style={{ color: theme.primary, fontSize: 12, marginTop: 4, fontWeight: "500" }}>
                      {t.tapToRetry || "Tap to retry"}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Account Settings Section */}
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 10, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t.accountSettings || "Account Settings"}
            </Text>
            <View
              style={{
                backgroundColor: theme.cardBackground,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                overflow: "hidden",
              }}
            >
              <SettingItem
                icon={<Globe size={22} color="#8b5cf6" />}
                iconBg="#8b5cf615"
                title={t.languages || "Language"}
                subtitle={language === "en" ? "English" : "Soomaali"}
                onPress={() => setShowLanguageModal(true)}
              />
              <Divider />
              <SettingItem
                icon={<Key size={22} color="#f59e0b" />}
                iconBg="#f59e0b15"
                title={t.changePassword}
                subtitle={t.updateAccountPassword || "Update your account password"}
                onPress={() => setShowChangePassword(true)}
              />
              <Divider />
              <SettingItem
                icon={<User size={22} color="#06b6d4" />}
                iconBg="#06b6d415"
                title={t.contactInformation || "Contact Information"}
                subtitle={userProfile.phone || t.noPhoneProvided}
                onPress={() =>
                  router.push({
                    pathname: "../(profile)/UpdateProfileScreen" as any,
                    params: { userProfile: JSON.stringify(userProfile) },
                  })
                }
              />
              <Divider />
              <SettingItem
                icon={<HelpCircle size={22} color="#10b981" />}
                iconBg="#10b98115"
                title={t.help || "Help"}
                subtitle="moh769888@gmail.com"
                onPress={() => Linking.openURL("mailto:moh769888@gmail.com?subject=Qoondeeye App Support")}
              />
            </View>
          </View>

          {/* Sign Out Button */}
          <View style={{ paddingHorizontal: 20 }}>
            <TouchableOpacity
              style={{
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: "#ef444440",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#ef444408",
              }}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <LogOut size={20} color="#ef4444" strokeWidth={2} />
              <Text style={{ color: "#ef4444", fontSize: 16, fontWeight: "600", marginLeft: 10 }}>
                {t.signOut}
              </Text>
            </TouchableOpacity>
          </View>

          {/* App Version */}
          <View style={{ alignItems: "center", marginTop: 32 }}>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>
              Qoondeeye v{Constants.expoConfig?.version || "2.4.0"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showChangePassword}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowChangePassword(false)}
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.5)", padding: 20 }}>
          <View
            style={{
              width: "100%",
              maxWidth: 400,
              backgroundColor: theme.cardBackground,
              borderRadius: 24,
              padding: 24,
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <Text style={{ color: theme.text, fontSize: 22, fontWeight: "700" }}>
                  {t.changePassword}
                </Text>
                <TouchableOpacity 
                  onPress={() => setShowChangePassword(false)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: theme.background,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <X size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Current Password */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                  {t.currentPassword}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1.5,
                    borderColor: theme.border,
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    backgroundColor: theme.background,
                  }}
                >
                  <Lock size={18} color={theme.textMuted} />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, color: theme.text, fontSize: 15 }}
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
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                  {t.newPassword}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1.5,
                    borderColor: theme.border,
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    backgroundColor: theme.background,
                  }}
                >
                  <Lock size={18} color={theme.textMuted} />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, color: theme.text, fontSize: 15 }}
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
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                  {t.confirmNewPassword}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1.5,
                    borderColor: theme.border,
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    backgroundColor: theme.background,
                  }}
                >
                  <Lock size={18} color={theme.textMuted} />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, color: theme.text, fontSize: 15 }}
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
                  backgroundColor: theme.primary + "10",
                  padding: 16,
                  borderRadius: 14,
                  marginBottom: 24,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600", marginBottom: 12 }}>
                  {t.passwordRequirements}
                </Text>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: 10, 
                      backgroundColor: passwordData.newPassword.length >= 8 ? "#10b98120" : "#ef444420",
                      justifyContent: "center",
                      alignItems: "center",
                    }}>
                      <Check
                        size={12}
                        color={passwordData.newPassword.length >= 8 ? "#10b981" : "#ef4444"}
                      />
                    </View>
                    <Text style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 10 }}>
                      {t.atLeast8Characters}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: 10, 
                      backgroundColor: /[A-Z]/.test(passwordData.newPassword) ? "#10b98120" : "#ef444420",
                      justifyContent: "center",
                      alignItems: "center",
                    }}>
                      <Check
                        size={12}
                        color={/[A-Z]/.test(passwordData.newPassword) ? "#10b981" : "#ef4444"}
                      />
                    </View>
                    <Text style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 10 }}>
                      {t.oneUppercaseLetter}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: 10, 
                      backgroundColor: /[0-9]/.test(passwordData.newPassword) ? "#10b98120" : "#ef444420",
                      justifyContent: "center",
                      alignItems: "center",
                    }}>
                      <Check
                        size={12}
                        color={/[0-9]/.test(passwordData.newPassword) ? "#10b981" : "#ef4444"}
                      />
                    </View>
                    <Text style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 10 }}>
                      {t.oneNumber}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary,
                  paddingVertical: 16,
                  borderRadius: 14,
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

      {/* Language Change Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.5)", padding: 20 }}>
          <View
            style={{
              width: "100%",
              maxWidth: 360,
              backgroundColor: theme.cardBackground,
              borderRadius: 24,
              padding: 24,
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <Text style={{ color: theme.text, fontSize: 22, fontWeight: "700" }}>
                {t.languages || "Language"}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowLanguageModal(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.background,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Language Options */}
            <View style={{ gap: 12 }}>
              {/* English */}
              <TouchableOpacity
                style={{
                  padding: 18,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: language === "en" ? theme.primary : theme.border,
                  backgroundColor: language === "en" ? theme.primary + "10" : theme.background,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onPress={() => {
                  setLanguage("en");
                  setShowLanguageModal(false);
                }}
              >
                <View style={{ 
                  width: 44, 
                  height: 44, 
                  borderRadius: 22, 
                  backgroundColor: "#f0f9ff",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 14,
                }}>
                  <Text style={{ fontSize: 22 }}>🇬🇧</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>
                    English
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>
                    English language
                  </Text>
                </View>
                {language === "en" && (
                  <View style={{ backgroundColor: '#dcfce7', borderRadius: 12, padding: 6 }}>
                    <Check size={18} color="#16a34a" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Somali */}
              <TouchableOpacity
                style={{
                  padding: 18,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: language === "so" ? theme.primary : theme.border,
                  backgroundColor: language === "so" ? theme.primary + "10" : theme.background,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onPress={() => {
                  setLanguage("so");
                  setShowLanguageModal(false);
                }}
              >
                <View style={{ 
                  width: 44, 
                  height: 44, 
                  borderRadius: 22, 
                  backgroundColor: "#f0f9ff",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 14,
                }}>
                  <Text style={{ fontSize: 22 }}>🇸🇴</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>
                    Soomaali
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>
                    Somali language
                  </Text>
                </View>
                {language === "so" && (
                  <View style={{ backgroundColor: '#dcfce7', borderRadius: 12, padding: 6 }}>
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
