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
} from "lucide-react-native";
import { deleteItemAsync } from "expo-secure-store";
import { supabase } from "~/lib/supabase";
import { UserProfile } from "~/types/userTypes";
import { useTheme } from "~/lib/theme";
import { 
  fetchProfile, 
  updateProfile, 
  updateProfileName, 
  updateProfilePhone, 
  updateProfileEmail,
  type Profile 
} from "~/lib/profiles";

type PasswordData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile>({
    fullName: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
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
              totalPredictions: 0,
              avgAccuracy: 0,
              joinDate: profileData.created_at || new Date().toISOString(),
              lastSignIn: user.last_sign_in_at || new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        Alert.alert("Error", "Failed to fetch profile data");
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
      setUserProfile(prev => ({
        ...prev,
        fullName: updatedProfile.full_name || prev.fullName,
        phone: updatedProfile.phone || prev.phone,
        image_url: updatedProfile.image_url || prev.image_url,
      }));

      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    }
  };

  const handleUpdateName = async (newName: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      await updateProfileName(user.id, newName);
      setUserProfile(prev => ({ ...prev, fullName: newName }));
      Alert.alert("Success", "Name updated successfully");
    } catch (error) {
      console.error("Error updating name:", error);
      Alert.alert("Error", "Failed to update name");
    }
  };

  const handleUpdatePhone = async (newPhone: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      await updateProfilePhone(user.id, newPhone);
      setUserProfile(prev => ({ ...prev, phone: newPhone }));
      Alert.alert("Success", "Phone updated successfully");
    } catch (error) {
      console.error("Error updating phone:", error);
      Alert.alert("Error", "Failed to update phone");
    }
  };

  const handleUpdateEmail = async (newEmail: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      await updateProfileEmail(user.id, newEmail);
      setUserProfile(prev => ({ ...prev, email: newEmail }));
      Alert.alert("Success", "Email updated successfully");
    } catch (error) {
      console.error("Error updating email:", error);
      Alert.alert("Error", "Failed to update email");
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
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // Validate new password requirements
    const passwordErrors = [];

    if (passwordData.newPassword.length < 8) {
      passwordErrors.push("At least 8 characters");
    }

    if (!/[A-Z]/.test(passwordData.newPassword)) {
      passwordErrors.push("One uppercase letter");
    }

    if (!/[0-9]/.test(passwordData.newPassword)) {
      passwordErrors.push("One number");
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
        "Password Requirements Not Met",
        `Your password must contain:\n\n• ${passwordErrors.join("\n• ")}`
      );
      return;
    }

    // Check if new password matches confirmation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert("Error", "New passwords don't match");
      return;
    }

    // Check if new password is same as current
    if (passwordData.newPassword === passwordData.currentPassword) {
      Alert.alert(
        "Error",
        "New password must be different from current password"
      );
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
        throw new Error("Current password is incorrect");
      }

      // If current password is correct, update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) throw updateError;

      Alert.alert("Success", "Password updated successfully");
      setShowChangePassword(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Password change error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update password. Please try again."
      );
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
      className="flex-1 "
      style={{ backgroundColor: theme.background }}
    >
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-5">
          <Text
            className="text-xs"
            style={{
              color: theme.text,
            }}
            className=" text-2xl font-bold"
          >
            Profile
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
              className="text-xs"
              style={{
                color: theme.text,
              }}
              className=" text-2xl font-bold mb-1"
            >
              {loading
                ? "Loading..."
                : userProfile.fullName || "No name provided"}
            </Text>
            <Text className="text-emerald-500 text-base mb-2">
              {loading ? "Loading..." : userProfile.email}
            </Text>
            <View className="flex-row items-center">
              <Clock size={14} color="#64748b" />
              <Text className="text-slate-500 text-sm ml-1.5">
                Last sign in: {formatLastSignIn(userProfile.lastSignIn)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View className="flex-row px-6 mb-8 gap-3">
          <View
            className="flex-1  rounded-xl p-4 items-center border "
            style={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            }}
          >
            <Calendar size={20} color="#10b981" />
            <Text
              className=" text-xl font-bold mt-2 mb-1"
              style={{
                color: theme.text,
              }}
            >
              {userProfile.totalPredictions}
            </Text>
            <Text
              className="text-xs"
              style={{
                color: theme.textSecondary,
              }}
            >
              Predictions
            </Text>
          </View>
          <View
            className="flex-1  rounded-xl p-4 items-center border "
            style={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            }}
          >
            <Target size={20} color="#3b82f6" />
            <Text
              className="text-xs"
              style={{
                color: theme.text,
              }}
              className="text-xl font-bold mt-2 mb-1"
            >
              {userProfile.avgAccuracy}%
            </Text>
            <Text
              className="text-xs"
              style={{
                color: theme.textSecondary,
              }}
              className=" text-xs"
            >
              Expense Accuracy
            </Text>
          </View>

          {/*<View
            className="flex-1  rounded-xl p-4 items-center border "
            style={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            }}
          >
            <UserCheck size={20} color="#8b5cf6" />
            <Text
              className="text-xs"
              style={{
                color: theme.text,
              }}
              className="text-xl font-bold mt-2 mb-1"
            >
              {Math.floor(
                (new Date().getTime() -
                  new Date(userProfile.joinDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )}
            </Text>
            <Text
              className="text-xs"
              style={{
                color: theme.textSecondary,
              }}
              className="text-xs"
            >
              Days Active
            </Text>
          </View>*/}
        </View>

        {/* Contact Information */}
        <View className="px-6 mb-8">
          <Text
            className="text-xs"
            style={{
              color: theme.text,
            }}
            className=" text-lg font-bold mb-4"
          >
            Contact Information
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
                <Text className="text-slate-400 text-xs mb-1">Full Name</Text>
                <Text
                  style={{
                    color: theme.text,
                  }}
                  className="text-base font-medium"
                >
                  {loading
                    ? "Loading..."
                    : userProfile.fullName || "No name provided"}
                </Text>
              </View>
              <TouchableOpacity
                className="p-2"
                onPress={() =>
                  router.push({
                    pathname: "../(profile)/UpdateProfileScreen" as any,
                    params: {
                      userProfile: JSON.stringify(userProfile),
                      focusField: "fullName",
                    },
                  })
                }
              >
                <Edit3 size={16} color={theme.icon} />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View className="h-px bg-slate-700 ml-14" />

            {/* Phone Number */}
            <View className="flex-row items-center p-4">
              <Phone size={20} color="#64748b" />
              <View className="ml-4 flex-1">
                <Text className="text-slate-400 text-xs mb-1">
                  Phone Number
                </Text>
                <Text
                  style={{
                    color: theme.text,
                  }}
                  className=" text-base font-medium"
                >
                  {loading
                    ? "Loading..."
                    : userProfile.phone || "No phone provided"}
                </Text>
              </View>
              <TouchableOpacity
                className="p-2"
                onPress={() =>
                  router.push({
                    pathname: "../(profile)/UpdateProfileScreen" as any,
                    params: {
                      userProfile: JSON.stringify(userProfile),
                      focusField: "phone",
                    },
                  })
                }
              >
                <Edit3 size={16} color={theme.icon} />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View className="h-px bg-slate-700 ml-14" />

            {/* Email */}
            <View className="flex-row items-center p-4">
              <Mail size={20} color="#64748b" />
              <View className="ml-4 flex-1">
                <Text className="text-slate-400 text-xs mb-1">
                  Email Address
                </Text>
                <Text
                  style={{
                    color: theme.text,
                  }}
                  className=" text-base font-medium"
                >
                  {loading
                    ? "Loading..."
                    : userProfile.email || "No phone provided"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View className="px-6 mb-8">
          <Text
            style={{ color: theme.text }}
            className="text-lg font-bold mb-4"
          >
            Security
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
                Change Password
              </Text>
              <Text className="text-slate-400 text-sm">
                Update your account password
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
            Sign out
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
              Change Password
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
                  Current Password
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
                    placeholder="Enter current password"
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
                  New Password
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
                    placeholder="Enter new password"
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
                  Confirm New Password
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
                    placeholder="Confirm new password"
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
                  Password Requirements:
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
                    At least 8 characters
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
                    One uppercase letter
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
                    One number
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
                  {loading ? "Updating..." : "Update Password"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
