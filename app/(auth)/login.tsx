import { useState } from 'react';
import { router } from 'expo-router';
import {
  Eye,
  EyeOff,
  LogIn,
  Mail,
  Lock,
  Smartphone,
} from 'lucide-react-native';
import {
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { setItemAsync } from 'expo-secure-store';
import { supabase } from '~/lib';
import AntDesign from '@expo/vector-icons/AntDesign';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Toast from 'react-native-toast-message';
import { useTheme } from '~/lib';
import { useLanguage } from '~/lib';

// Required for Expo OAuth
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const theme = useTheme();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<
    'google' | 'github' | null
  >(null);

  const handleLogin = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      Toast.show({
        type: 'error',
        position: 'top',
        text1: 'Login failed',
        text2: 'Please check your credentials and try again.',
        visibilityTime: 6000,
        autoHide: true,
        topOffset: 50,
      });
      return;
    }

    Toast.show({
      type: 'success',
      position: 'top',
      text1: 'Welcome back!',
      text2: 'Successfully signed in',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 50,
    });

    // Save token securely
    await setItemAsync('token', data.session?.access_token);
    await setItemAsync('userId', data.user?.id);
    await setItemAsync('supabase_session', JSON.stringify(data.session));

    router.replace('/(main)/Dashboard');
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setSocialLoading(provider);

    try {
      const redirectUrl = AuthSession.makeRedirectUri();

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
          redirectUrl,
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
              await setItemAsync('token', sessionData.session.access_token);
              router.push('../(main)/Dashboard' as any);
            }
          }
        }
      }
    } catch (error) {
      Alert.alert(t.loginError);
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          paddingHorizontal: 24,
          justifyContent: 'center',
        }}>
        {/* Header */}
        <View className="items-center mb-6">
          <View
            style={{
              backgroundColor: `${theme.primary}20`,
              padding: 16,
              borderRadius: 32,
              marginBottom: 16,
            }}>
            <LogIn size={32} color={theme.primary} />
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 24,
              fontWeight: 'bold',
              marginBottom: 8,
            }}>
            {t.welcomeBack}
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              textAlign: 'center',
              lineHeight: 24,
            }}>
            {t.signInDescription}
          </Text>
        </View>

        {/* Email */}
        <View className="mb-4">
          <Text style={{ color: theme.text, marginBottom: 4 }}>
            {t.emailAddress}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.cardBackground,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              paddingHorizontal: 16,
            }}>
            <Mail size={20} color={theme.textMuted} />
            <TextInput
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 8,
                color: theme.text,
              }}
              placeholder={t.enterYourEmail}
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Password */}
        <View className="mb-4">
          <Text style={{ color: theme.text, marginBottom: 4 }}>
            {t.password}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.cardBackground,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              paddingHorizontal: 16,
            }}>
            <Lock size={20} color={theme.textMuted} />
            <TextInput
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 8,
                color: theme.text,
              }}
              placeholder={t.enterYourPassword}
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={20} color={theme.textMuted} />
              ) : (
                <Eye size={20} color={theme.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Remember / Forgot */}
        {/*<View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity
          onPress={() => router.push("/(forget)/forgot-password-screen")}
        >
          <Text style={{ color: theme.text }}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>*/}

        {/* Login */}
        <Button
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.primary,
            borderRadius: 12,
            padding: 16,
            marginTop: 8,
          }}
          onPress={handleLogin}
          disabled={loading}>
          <Text
            style={{
              color: theme.primaryText,
              fontWeight: 'bold',
              marginLeft: 8,
              marginRight: 8,
            }}>
            {loading ? t.signingIn : t.signIn}
          </Text>
          <LogIn size={20} color={theme.primaryText} />
        </Button>

        {/* Divider */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginVertical: 24,
          }}>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
          <Text
            style={{
              marginHorizontal: 16,
              color: theme.textMuted,
              fontSize: 14,
              fontWeight: '600',
            }}>
            {t.or}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
        </View>

        {/* Google Button */}
        {/*<TouchableOpacity
        className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl p-4"
        onPress={() => handleSocialLogin("google")}
        disabled={socialLoading !== null || loading}
      >
        {socialLoading === "google" ? (
          <View className="w-8 h-8 justify-center items-center mr-4">
            <AntDesign name="loading1" size={24} color="#ffffff" />
          </View>
        ) : (
          <View className="w-8 h-8 bg-white rounded-full justify-center items-center mr-4">
            <AntDesign name="google" size={24} color="black" />
          </View>
        )}
        <Text className="text-white font-medium flex-1">
          Continue with Google
        </Text>
      </TouchableOpacity>*/}

        {/* Github Button */}
        {/*<TouchableOpacity
        className="flex-row items-center mt-2 bg-slate-800 border border-slate-700 rounded-xl p-4"
        onPress={() => handleSocialLogin("github")}
        disabled={socialLoading !== null || loading}
      >
        {socialLoading === "github" ? (
          <View className="w-8 h-8 justify-center items-center mr-4">
            <AntDesign name="loading1" size={24} color="#ffffff" />
          </View>
        ) : (
          <View className="w-8 h-8 bg-white rounded-full justify-center items-center mr-4">
            <AntDesign name="github" size={24} color="black" />
          </View>
        )}
        <Text className="text-white font-medium flex-1">
          Continue with Github
        </Text>
      </TouchableOpacity>*/}

        {/* Footer */}
        <View style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: theme.textSecondary }}>
            {t.dontHaveAccount}{' '}
            <Text
              style={{ color: theme.primary, fontWeight: 'bold' }}
              onPress={() => router.push('/signup')}>
              {t.signUp}
            </Text>
          </Text>
        </View>
      </View>
    </>
  );
}
