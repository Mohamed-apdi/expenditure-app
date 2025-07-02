import { useState } from "react";
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
  AtSign,
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
} from "lucide-react-native";
import { deleteItemAsync } from "expo-secure-store";
import { supabase } from "~/lib/supabase";

type UserProfile = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  lastSignIn: string;
  profileImage: string;
  joinDate: string;
  totalPredictions: number;
  avgAccuracy: number;
};

type PasswordData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [userProfile] = useState<UserProfile>({
    fullName: "John Smith",
    username: "johnsmith",
    email: "john.smith@email.com",
    phone: "+1 (555) 123-4567",
    lastSignIn: "2024-01-15T10:30:00Z",
    profileImage:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    joinDate: "2023-08-15",
    totalPredictions: 24,
    avgAccuracy: 87,
  });

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const formatLastSignIn = (dateString: string) => {
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

  const handleChangePassword = () => {
    Alert.alert("Success", "Password changed successfully");
    setShowChangePassword(false);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you absolutely sure? This action cannot be undone and will permanently delete your account and all associated data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Account Deleted",
              "Your account has been permanently deleted."
            );
            router.push("../(onboarding)/welcomeScreen.tsx" as any);
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      // 1. Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // 2. Clear all stored tokens
      await deleteItemAsync("token");
      await deleteItemAsync("refresh_token"); // If you stored this

      // 3. Optional: Clear any other user-related data
      // await deleteItemAsync('user_profile');

      // 4. Redirect to login screen
      router.replace("../(onboarding)/welcomeScreen" as any);

      return true;
    } catch (err) {
      console.error("Logout error:", err);
      return false;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-5">
          <Text className="text-white text-2xl font-bold">Profile</Text>
          <TouchableOpacity
            className="p-2"
            onPress={() =>
              router.push({
                pathname: "../(profile)/UpdateProfileScreen" as any,
                params: { userProfile: JSON.stringify(userProfile) },
              })
            }
          >
            <Edit3 size={20} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* Profile Image & Basic Info */}
        <View className="items-center px-6 pb-8">
          <View className="relative mb-4">
            <Image
              source={{ uri: userProfile.profileImage }}
              className="w-32 h-32 rounded-full border-4 border-emerald-500"
            />
            <TouchableOpacity className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-emerald-500 justify-center items-center border-[3px] border-slate-900">
              <Camera size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View className="items-center">
            <Text className="text-white text-2xl font-bold mb-1">
              {userProfile.fullName}
            </Text>
            <Text className="text-emerald-500 text-base mb-2">
              @{userProfile.username}
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
          <View className="flex-1 bg-slate-800 rounded-xl p-4 items-center border border-slate-700">
            <Calendar size={20} color="#10b981" />
            <Text className="text-white text-xl font-bold mt-2 mb-1">
              {userProfile.totalPredictions}
            </Text>
            <Text className="text-slate-400 text-xs">Predictions</Text>
          </View>
          <View className="flex-1 bg-slate-800 rounded-xl p-4 items-center border border-slate-700">
            <Target size={20} color="#3b82f6" />
            <Text className="text-white text-xl font-bold mt-2 mb-1">
              {userProfile.avgAccuracy}%
            </Text>
            <Text className="text-slate-400 text-xs">Accuracy</Text>
          </View>
          <View className="flex-1 bg-slate-800 rounded-xl p-4 items-center border border-slate-700">
            <UserCheck size={20} color="#8b5cf6" />
            <Text className="text-white text-xl font-bold mt-2 mb-1">
              {Math.floor(
                (new Date().getTime() -
                  new Date(userProfile.joinDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )}
            </Text>
            <Text className="text-slate-400 text-xs">Days Active</Text>
          </View>
        </View>

        {/* Contact Information */}
        <View className="px-6 mb-8">
          <Text className="text-white text-lg font-bold mb-4">
            Contact Information
          </Text>

          <View className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {/* Full Name */}
            <View className="flex-row items-center p-4">
              <User size={20} color="#64748b" />
              <View className="ml-4 flex-1">
                <Text className="text-slate-400 text-xs mb-1">Full Name</Text>
                <Text className="text-white text-base font-medium">
                  {userProfile.fullName}
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
                <Edit3 size={16} color="#94a3b8" />
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
                <Text className="text-white text-base font-medium">
                  {userProfile.phone}
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
                <Edit3 size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View className="h-px bg-slate-700 ml-14" />

            {/* Username */}
            <View className="flex-row items-center p-4">
              <AtSign size={20} color="#64748b" />
              <View className="ml-4 flex-1">
                <Text className="text-slate-400 text-xs mb-1">Username</Text>
                <Text className="text-white text-base font-medium">
                  @{userProfile.username}
                </Text>
              </View>
              <TouchableOpacity
                className="p-2"
                onPress={() =>
                  router.push({
                    pathname: "../(profile)/UpdateProfileScreen" as any,
                    params: {
                      userProfile: JSON.stringify(userProfile),
                      focusField: "username",
                    },
                  })
                }
              >
                <Edit3 size={16} color="#94a3b8" />
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
                <Text className="text-white text-base font-medium">
                  {userProfile.email}
                </Text>
              </View>
              <TouchableOpacity
                className="p-2"
                onPress={() =>
                  router.push({
                    pathname: "../(profile)/UpdateProfileScreen" as any,
                    params: {
                      userProfile: JSON.stringify(userProfile),
                      focusField: "email",
                    },
                  })
                }
              >
                <Edit3 size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View className="px-6 mb-8">
          <Text className="text-white text-lg font-bold mb-4">Security</Text>

          {/* Change Password */}
          <TouchableOpacity
            className="flex-row items-center bg-slate-800 rounded-xl p-4 mb-3 border border-slate-700"
            onPress={() => setShowChangePassword(true)}
          >
            <View className="w-10 h-10 rounded-full bg-slate-700 justify-center items-center mr-4">
              <Key size={20} color="#10b981" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-semibold mb-1">
                Change Password
              </Text>
              <Text className="text-slate-400 text-sm">
                Update your account password
              </Text>
            </View>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 2FA */}
          <TouchableOpacity className="flex-row items-center bg-slate-800 rounded-xl p-4 mb-3 border border-slate-700">
            <View className="w-10 h-10 rounded-full bg-slate-700 justify-center items-center mr-4">
              <Smartphone size={20} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-semibold mb-1">
                Two-Factor Authentication
              </Text>
              <Text className="text-slate-400 text-sm">
                Add an extra layer of security
              </Text>
            </View>
            <View className="w-11 h-6 rounded-full bg-slate-700 justify-start p-0.5">
              <View className="w-5 h-5 rounded-full bg-white" />
            </View>
          </TouchableOpacity>

          {/* Privacy Settings */}
          <TouchableOpacity className="flex-row items-center bg-slate-800 rounded-xl p-4 border border-slate-700">
            <View className="w-10 h-10 rounded-full bg-slate-700 justify-center items-center mr-4">
              <Shield size={20} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-semibold mb-1">
                Privacy Settings
              </Text>
              <Text className="text-slate-400 text-sm">
                Manage your data and privacy
              </Text>
            </View>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View className="px-6 mb-8">
          <Text className="text-red-500 text-lg font-bold mb-4">
            Danger Zone
          </Text>

          <View className="bg-slate-800 rounded-xl p-5 border border-red-500">
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <AlertTriangle size={20} color="#ef4444" />
                <Text className="text-red-500 text-base font-bold ml-2">
                  Delete Account
                </Text>
              </View>
              <Text className="text-slate-400 text-sm leading-5">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </Text>
            </View>

            <TouchableOpacity
              className="flex-row items-center justify-center bg-red-500 py-3 px-4 rounded-md"
              onPress={handleDeleteAccount}
            >
              <Trash2 size={16} color="#ffffff" />
              <Text className="text-white text-sm font-bold ml-2">
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          className="flex-row items-center justify-center mx-6 mb-8 py-4 rounded-xl border border-red-500"
          onPress={handleLogout}
        >
          <LogOut size={20} color="#ef4444" />
          <Text className="text-red-500 text-base font-semibold ml-2">
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showChangePassword}
        animationType="slide"
        onRequestClose={() => setShowChangePassword(false)}
      >
        <SafeAreaView className="flex-1 bg-slate-900">
          {/* Modal Header */}
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
            <Text className="text-white text-xl font-bold">
              Change Password
            </Text>
            <TouchableOpacity
              className="p-2"
              onPress={() => setShowChangePassword(false)}
            >
              <X size={24} color="#f8fafc" />
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView className="flex-1 px-6">
            <View className="py-6">
              {/* Current Password */}
              <View className="mb-5">
                <Text className="text-white text-sm font-semibold mb-2">
                  Current Password
                </Text>
                <View className="flex-row items-center bg-slate-800 rounded-xl border border-slate-700 px-4">
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
                    secureTextEntry
                  />
                </View>
              </View>

              {/* New Password */}
              <View className="mb-5">
                <Text className="text-white text-sm font-semibold mb-2">
                  New Password
                </Text>
                <View className="flex-row items-center bg-slate-800 rounded-xl border border-slate-700 px-4">
                  <Lock size={20} color="#64748b" className="mr-3" />
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
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Confirm Password */}
              <View className="mb-5">
                <Text className="text-white text-sm font-semibold mb-2">
                  Confirm New Password
                </Text>
                <View className="flex-row items-center bg-slate-800 rounded-xl border border-slate-700 px-4">
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
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Password Requirements */}
              <View className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-6">
                <Text className="text-slate-400 text-xs font-medium mb-2">
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
                  <Text className="text-slate-200 text-xs ml-2">
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
                  <Text className="text-slate-200 text-xs ml-2">
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
                  <Text className="text-slate-200 text-xs ml-2">
                    One number
                  </Text>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                className="bg-emerald-500 py-4 rounded-xl items-center"
                onPress={handleChangePassword}
              >
                <Text className="text-white text-base font-bold">
                  Update Password
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
