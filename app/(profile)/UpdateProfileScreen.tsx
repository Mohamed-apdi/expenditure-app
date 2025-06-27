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
  X, Camera, User, AtSign, Mail, Phone, Shield, 
  Bell, Info, ChevronRight, Check 
} from "lucide-react-native";

type FormData = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  profileImage: string;
};

type Errors = {
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
};

export default function UpdateProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userProfile = params.userProfile ? JSON.parse(params.userProfile as string) : {};
  const focusField = params.focusField as string | undefined;

  const [formData, setFormData] = useState<FormData>({
    fullName: userProfile?.fullName || "",
    username: userProfile?.username || "",
    email: userProfile?.email || "",
    phone: userProfile?.phone || "",
    profileImage: userProfile?.profileImage || "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Refs for focusing specific fields
  const fullNameRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  useEffect(() => {
    // Focus specific field if passed from profile screen
    if (focusField) {
      setTimeout(() => {
        switch (focusField) {
          case "fullName":
            fullNameRef.current?.focus();
            break;
          case "username":
            usernameRef.current?.focus();
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

  const updateFormData = <K extends keyof FormData & keyof Errors>(key: K | keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  
    // Clear error for this field when user starts typing
    if ((key in errors)) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Errors = {};

    // Full Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = "Username can only contain letters, numbers, and underscores";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation
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
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // TODO: Implement actual API call to update profile
      await new Promise((resolve) => setTimeout(resolve, 1500));

      Alert.alert("Success", "Profile updated successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert("Discard Changes", "You have unsaved changes. Are you sure you want to go back?", [
        { text: "Keep Editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  const handleChangePhoto = () => {
    Alert.alert("Change Profile Photo", "Choose an option", [
      { text: "Cancel", style: "cancel" },
      { text: "Take Photo", onPress: () => console.log("Take photo") },
      { text: "Choose from Library", onPress: () => console.log("Choose from library") },
      { 
        text: "Remove Photo", 
        style: "destructive", 
        onPress: () => updateFormData("profileImage", "") 
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
          <TouchableOpacity className="p-2" onPress={handleCancel}>
            <X size={24} color="#94a3b8" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold">Update Profile</Text>
          <TouchableOpacity
            className={`py-2 px-4 rounded-lg ${(!hasChanges || loading) ? "bg-slate-700" : "bg-emerald-500"}`}
            onPress={handleSave}
            disabled={!hasChanges || loading}
          >
            <Text className={`text-sm font-bold ${(!hasChanges || loading) ? "text-slate-500" : "text-white"}`}>
              {loading ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {/* Profile Photo Section */}
          <View className="items-center py-8 px-6">
            <View className="relative mb-3">
              {formData.profileImage ? (
                <Image 
                  source={{ uri: formData.profileImage }} 
                  className="w-32 h-32 rounded-full border-4 border-emerald-500"
                />
              ) : (
                <View className="w-32 h-32 rounded-full bg-slate-800 border-4 border-slate-700 justify-center items-center">
                  <User size={40} color="#64748b" />
                </View>
              )}
              <TouchableOpacity 
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-emerald-500 justify-center items-center border-[3px] border-slate-900"
                onPress={handleChangePhoto}
              >
                <Camera size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <Text className="text-slate-400 text-sm text-center">Tap to change your profile photo</Text>
          </View>

          {/* Form Fields */}
          <View className="px-6">
            {/* Full Name */}
            <View className="mb-6">
              <Text className="text-white text-sm font-semibold mb-2">Full Name</Text>
              <View className={`flex-row items-center bg-slate-800 rounded-xl border ${errors.fullName ? "border-red-500" : "border-slate-700"} px-4`}>
                <User size={20} color="#64748b" className="mr-3" />
                <TextInput
                  ref={fullNameRef}
                  className="flex-1 py-4 text-white text-base"
                  placeholder="Enter your full name"
                  placeholderTextColor="#64748b"
                  value={formData.fullName}
                  onChangeText={(value) => updateFormData("fullName", value)}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => usernameRef.current?.focus()}
                />
              </View>
              {errors.fullName && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.fullName}</Text>}
            </View>

            {/* Username */}
            <View className="mb-6">
              <Text className="text-white text-sm font-semibold mb-2">Username</Text>
              <View className={`flex-row items-center bg-slate-800 rounded-xl border ${errors.username ? "border-red-500" : "border-slate-700"} px-4`}>
                <AtSign size={20} color="#64748b" className="mr-3" />
                <TextInput
                  ref={usernameRef}
                  className="flex-1 py-4 text-white text-base"
                  placeholder="Enter your username"
                  placeholderTextColor="#64748b"
                  value={formData.username}
                  onChangeText={(value) => updateFormData("username", value.toLowerCase())}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
              {errors.username && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.username}</Text>}
              <Text className="text-slate-400 text-xs mt-1 ml-1">Only letters, numbers, and underscores allowed</Text>
            </View>

            {/* Email */}
            <View className="mb-6">
              <Text className="text-white text-sm font-semibold mb-2">Email Address</Text>
              <View className={`flex-row items-center bg-slate-800 rounded-xl border ${errors.email ? "border-red-500" : "border-slate-700"} px-4`}>
                <Mail size={20} color="#64748b" className="mr-3" />
                <TextInput
                  ref={emailRef}
                  className="flex-1 py-4 text-white text-base"
                  placeholder="Enter your email address"
                  placeholderTextColor="#64748b"
                  value={formData.email}
                  onChangeText={(value) => updateFormData("email", value.toLowerCase())}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />
              </View>
              {errors.email && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.email}</Text>}
            </View>

            {/* Phone Number */}
            <View className="mb-6">
              <Text className="text-white text-sm font-semibold mb-2">Phone Number</Text>
              <View className={`flex-row items-center bg-slate-800 rounded-xl border ${errors.phone ? "border-red-500" : "border-slate-700"} px-4`}>
                <Phone size={20} color="#64748b" className="mr-3" />
                <TextInput
                  ref={phoneRef}
                  className="flex-1 py-4 text-white text-base"
                  placeholder="Enter your phone number"
                  placeholderTextColor="#64748b"
                  value={formData.phone}
                  onChangeText={(value) => updateFormData("phone", value)}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                />
              </View>
              {errors.phone && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.phone}</Text>}
              <Text className="text-slate-400 text-xs mt-1 ml-1">Include country code (e.g., +1 555 123 4567)</Text>
            </View>
          </View>

          {/* Additional Options */}
          <View className="px-6 py-4 gap-3">
            <TouchableOpacity className="flex-row items-center bg-slate-800 rounded-xl p-4 border border-slate-700">
              <Shield size={20} color="#3b82f6" />
              <View className="ml-4 flex-1">
                <Text className="text-white text-base font-semibold">Privacy Settings</Text>
                <Text className="text-slate-400 text-sm">Control who can see your profile</Text>
              </View>
              <ChevronRight size={20} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center bg-slate-800 rounded-xl p-4 border border-slate-700">
              <Bell size={20} color="#8b5cf6" />
              <View className="ml-4 flex-1">
                <Text className="text-white text-base font-semibold">Notification Preferences</Text>
                <Text className="text-slate-400 text-sm">Manage your notification settings</Text>
              </View>
              <ChevronRight size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View className="flex-row items-start bg-slate-800 mx-6 my-4 p-4 rounded-xl border border-blue-500">
            <Info size={20} color="#3b82f6" className="mt-0.5" />
            <Text className="text-slate-400 text-sm ml-3 flex-1">
              Your profile information is encrypted and stored securely. We never share your personal data with third
              parties.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}