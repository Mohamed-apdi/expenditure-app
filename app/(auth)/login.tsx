import { useState } from 'react';
import { router } from 'expo-router';
import {
  Eye,
  EyeOff,
  LogIn,
  Mail,
  Lock,
} from 'lucide-react-native';
import {
  View,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { setItemAsync } from 'expo-secure-store';
import { supabase } from '~/lib';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Toast from 'react-native-toast-message';
import { useTheme } from '~/lib';
import { useLanguage } from '~/lib';
import { createAccount, fetchAccounts } from '~/lib/services/accounts';

// Required for Expo OAuth
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const theme = useTheme();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<
    'google' | null
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
        text2: error.message || 'Please check your credentials and try again.',
        visibilityTime: 6000,
        autoHide: true,
        topOffset: 50,
      });
      return;
    }

    if (!data.session) {
      Toast.show({
        type: 'error',
        position: 'top',
        text1: 'Login failed',
        text2: 'No session data received',
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
    if (data.session.access_token) {
      await setItemAsync('token', data.session.access_token);
    }
    if (data.user?.id) {
      await setItemAsync('userId', data.user.id);
    }
    if (data.session) {
      await setItemAsync('supabase_session', JSON.stringify(data.session));
    }

    router.replace('/(main)/Dashboard');
  };

  const handleSocialLogin = async (provider: 'google') => {
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

            if (sessionData.session && sessionData.user?.id) {
              await setItemAsync('token', sessionData.session.access_token);
              await setItemAsync('userId', sessionData.user.id);
              await setItemAsync('supabase_session', JSON.stringify(sessionData.session));

              // Check if user has any accounts, if not create "Account 1"
              try {
                const existingAccounts = await fetchAccounts(sessionData.user.id);
                if (existingAccounts.length === 0) {
                  await createAccount({
                    user_id: sessionData.user.id,
                    account_type: 'Accounts',
                    name: 'Account 1',
                    amount: 0,
                    description: 'Default account',
                    is_default: true,
                    currency: 'USD',
                  });
                }
              } catch (accountError) {
                console.error('Error creating default account:', accountError);
                // Don't block login if account creation fails
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

              router.replace('/(main)/Dashboard');
            }
          } else {
            // Try to get tokens from query params if not in hash
            const queryParams = new URLSearchParams(url.search);
            const queryAccessToken = queryParams.get('access_token');
            const queryRefreshToken = queryParams.get('refresh_token');

            if (queryAccessToken && queryRefreshToken) {
              const { data: sessionData, error: sessionError } =
                await supabase.auth.setSession({
                  access_token: queryAccessToken,
                  refresh_token: queryRefreshToken,
                });

              if (sessionError) throw sessionError;

              if (sessionData.session && sessionData.user?.id) {
                await setItemAsync('token', sessionData.session.access_token);
                await setItemAsync('userId', sessionData.user.id);
                await setItemAsync('supabase_session', JSON.stringify(sessionData.session));

                // Check if user has any accounts, if not create "Account 1"
                try {
                  const existingAccounts = await fetchAccounts(sessionData.user.id);
                  if (existingAccounts.length === 0) {
                    await createAccount({
                      user_id: sessionData.user.id,
                      account_type: 'Accounts',
                      name: 'Account 1',
                      amount: 0,
                      description: 'Default account',
                      is_default: true,
                      currency: 'USD',
                    });
                  }
                } catch (accountError) {
                  console.error('Error creating default account:', accountError);
                  // Don't block login if account creation fails
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

                router.replace('/(main)/Dashboard');
              }
            }
          }
        } else if (result.type === 'cancel') {
          Toast.show({
            type: 'info',
            position: 'top',
            text1: 'Sign in cancelled',
            text2: 'You cancelled the sign in process',
            visibilityTime: 3000,
            autoHide: true,
            topOffset: 50,
          });
        }
      }
    } catch (error: any) {
      console.error('Social login error:', error);
      Toast.show({
        type: 'error',
        position: 'top',
        text1: 'Sign in failed',
        text2: error?.message || 'An error occurred during sign in',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 50,
      });
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
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.cardBackground,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            padding: 16,
          }}
          onPress={() => handleSocialLogin('google')}
          disabled={socialLoading !== null || loading}>
          {socialLoading === 'google' ? (
            <View style={{ width: 24, height: 24, marginRight: 12, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : (
            <Image
              source={require('../../assets/images/google_icon.png')}
              style={{ width: 24, height: 24, marginRight: 12 }}
              resizeMode="contain"
            />
          )}
          <Text
            style={{
              color: theme.text,
              fontWeight: '600',
              flex: 1,
              fontSize: 16,
            }}>
            {t.continueWithGoogle}
          </Text>
        </TouchableOpacity>

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
