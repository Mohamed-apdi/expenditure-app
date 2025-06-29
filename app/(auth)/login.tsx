import { useState } from 'react';
import { router } from 'expo-router';
import { Eye, EyeOff, LogIn, Mail, Lock, Smartphone } from 'lucide-react-native';
import { View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { setItemAsync } from 'expo-secure-store';
import { supabase } from '~/lib/supabase';
import AntDesign from '@expo/vector-icons/AntDesign';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// Required for Expo OAuth
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null);

  const handleLogin = async () => {
  setLoading(true);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  setLoading(false);

  if (error) {
    console.log("Login error:", error);
    alert(error.message);
    return;
  }
  
  // Save token securely
  await setItemAsync("token", data.session?.access_token);

  router.push("../(main)/Dashboard" as any);
};


 const handleSocialLogin = async (provider: 'google' | 'github') => {
    setSocialLoading(provider);
    
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      // For iOS/Android - open the browser for OAuth flow
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success') {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { data: sessionData, error: sessionError } = 
              await supabase.auth.setSession({
                access_token,
                refresh_token,
              });

            if (sessionError) throw sessionError;

            if (sessionData.session?.access_token) {
              await setItemAsync("token", sessionData.session.access_token);
              router.push("../(main)/Dashboard" as any);
            }
          }
        }
      }
    } catch (error) {
      console.log("error: ", error)
      Alert.alert("Login Error");
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <View className="flex-1 bg-slate-900 px-6 justify-center">
      {/* Header */}
      <View className="items-center mb-6">
        <View className="bg-emerald-400/20 p-4 rounded-full mb-4">
          <LogIn size={32} color="#10b981" />
        </View>
        <Text className="text-white text-2xl font-bold mb-2">Welcome Back</Text>
        <Text className="text-slate-400 text-center leading-6">
          Sign in to access your household expenditure predictions
        </Text>
      </View>

      {/* Email */}
      <View className="mb-4">
        <Text className="text-slate-200 mb-1">Email Address</Text>
        <View className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl px-4">
          <Mail size={20} color="#64748b" />
          <TextInput
            className="flex-1 py-3 px-2 text-white"
            placeholder="Enter your email"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Password */}
      <View className="mb-4">
        <Text className="text-slate-200 mb-1">Password</Text>
        <View className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl px-4">
          <Lock size={20} color="#64748b" />
          <TextInput
            className="flex-1 py-3 px-2 text-white"
            placeholder="Enter your password"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Remember / Forgot */}
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity
          onPress={() => setRememberMe(!rememberMe)}
          className="flex-row items-center space-x-2"
        >
          <View
            className={`w-5 h-5 rounded-md border-2 border-slate-600 ${
              rememberMe ? 'bg-emerald-500 border-emerald-500' : ''
            } items-center justify-center`}
          >
            {rememberMe && <Text className="text-white text-xs">✓</Text>}
          </View>
          <Text className="text-slate-300 ml-2">Remember me</Text>
        </TouchableOpacity>
        <Text className="text-emerald-400">Forgot Password?</Text>
      </View>

      {/* Login */}
      <Button onPress={handleLogin} disabled={loading}>
        <Text className="text-black font-bold text-center mr-2">
          {loading ? 'Signing In...' : 'Sign In'}
        </Text>
        <LogIn size={20} color="#ffffff" />
      </Button>

      {/* Divider */}
      <View className="flex-row items-center my-6">
        <View className="flex-1 h-px bg-slate-700" />
        <Text className="mx-4 text-slate-500 text-sm font-semibold">OR</Text>
        <View className="flex-1 h-px bg-slate-700" />
      </View>

      {/* Google Button */}
      <TouchableOpacity className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl p-4"
        onPress={() => handleSocialLogin('google')}
        disabled={socialLoading !== null || loading}
      >
         {socialLoading === 'google' ? (
          <View className="w-8 h-8 justify-center items-center mr-4">
            <AntDesign name="loading1" size={24} color="#ffffff" />
          </View>
        ) : (
          <View className="w-8 h-8 bg-white rounded-full justify-center items-center mr-4">
            <AntDesign name="google" size={24} color="black" />
          </View>
        )}
        <Text className="text-white font-medium flex-1">Continue with Google</Text>
      </TouchableOpacity>

      {/* Github Button */}
      <TouchableOpacity className="flex-row items-center mt-2 bg-slate-800 border border-slate-700 rounded-xl p-4"
        onPress={() => handleSocialLogin('github')}
        disabled={socialLoading !== null || loading}
      >
         {socialLoading === 'github' ? (
          <View className="w-8 h-8 justify-center items-center mr-4">
            <AntDesign name="loading1" size={24} color="#ffffff" />
          </View>
        ) : (
          <View className="w-8 h-8 bg-white rounded-full justify-center items-center mr-4">
            <AntDesign name="github" size={24} color="black" />
          </View>
        )}
        <Text className="text-white font-medium flex-1">Continue with Github</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View className="mt-6 items-center">
        <Text className="text-slate-400">
          Don’t have an account?{' '}
          <Text className="text-emerald-400 font-bold" onPress={() => router.push('/signup')}>
            Sign Up
          </Text>
        </Text>
      </View>
    </View>
  );
}
