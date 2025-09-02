import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import {
  PieChart,
  Users,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  DollarSign,
} from "lucide-react-native";
import { useEffect, useRef } from "react";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import { StatusBar } from "expo-status-bar";

const { width, height } = Dimensions.get("window");

// Floating particle component
const FloatingParticle = ({ style }: any) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 3000 + Math.random() * 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 3000 + Math.random() * 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.8, 0.2],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ translateY }],
          opacity,
          position: "absolute",
        },
      ]}
    />
  );
};

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideUpAnim = useRef(new Animated.Value(20)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const screenTransition = useRef(new Animated.Value(0)).current;

  // Generate random particles
  const particles = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    size: 2 + Math.random() * 3,
    left: Math.random() * 100,
    top: 10 + Math.random() * 80,
  }));

  useEffect(() => {
    // Main fade animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Scale animation for main illustration
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();

    // Slide up animation for text
    Animated.timing(slideUpAnim, {
      toValue: 0,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // Rotate animation for pie chart icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconRotate, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(iconRotate, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const rotateInterpolate = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-15deg", "15deg"],
  });

  const handleNavigate = () => {
    // Start screen transition animation
    Animated.timing(screenTransition, {
      toValue: 1,
      duration: 400,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      // Navigate after animation completes
      router.push("/inputCategoriesScreen");
    });
  };

  const screenInterpolate = screenTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.9],
  });

  const screenOpacity = screenTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <>
      <StatusBar style="auto" />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Floating particles background */}
        {particles.map((particle) => (
          <FloatingParticle
            key={particle.id}
            style={{
              width: particle.size,
              height: particle.size,
              borderRadius: particle.size / 2,
              backgroundColor: theme.primary,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
            }}
          />
        ))}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [
              { scale: screenInterpolate },
              {
                translateY: screenTransition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 20],
                }),
              },
            ],
          }}
          className="flex-1 px-6 justify-between py-10"
        >
          {/* Progress Indicator */}
          <View className="flex-row items-center justify-center gap-1.5">
            <View
              style={{
                width: 24,
                height: 8,
                backgroundColor: theme.primary,
                borderRadius: 4,
              }}
            />
            <View
              style={{
                width: 8,
                height: 8,
                backgroundColor: theme.textMuted,
                borderRadius: 4,
              }}
            />
            <View
              style={{
                width: 8,
                height: 8,
                backgroundColor: theme.textMuted,
                borderRadius: 4,
              }}
            />
          </View>

          {/* Hero Illustration */}
          <View className="items-center mt-10">
            <Animated.View
              style={{
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
                width: 192,
                height: 192,
                backgroundColor: theme.cardBackground,
                borderRadius: 96,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2,
                borderColor: `${theme.primary}80`,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <Animated.View
                style={{ transform: [{ rotate: rotateInterpolate }] }}
              >
                <PieChart size={80} color={theme.primary} strokeWidth={1.8} />
              </Animated.View>
              <Animated.View
                style={{
                  transform: [{ scale: scaleAnim }],
                  opacity: fadeAnim,
                  position: "absolute",
                  bottom: -20,
                  right: 20,
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  padding: 8,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                <DollarSign size={40} color={theme.primaryText} />
              </Animated.View>
            </Animated.View>
          </View>

          {/* Title and Tagline */}
          <Animated.View
            style={{
              transform: [{ translateY: slideUpAnim }],
              opacity: fadeAnim,
              alignItems: "center",
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 30,
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              {t.appName}
            </Text>
            <Text
              style={{
                color: theme.primary,
                fontSize: 18,
                textAlign: "center",
                fontWeight: "600",
                marginBottom: 12,
              }}
            >
              {t.tagline}
            </Text>
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 16,
                textAlign: "center",
                lineHeight: 24,
              }}
            >
              {t.descriptionHome}
            </Text>
          </Animated.View>

          {/* Features */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
              flexDirection: "row",
              justifyContent: "space-around",
              paddingHorizontal: 20,
            }}
          >
            <View style={{ alignItems: "center", flex: 1 }}>
              <TrendingUp size={26} color={theme.primary} />
              <Text
                style={{
                  color: theme.text,
                  fontSize: 14,
                  marginTop: 8,
                  textAlign: "center",
                  fontWeight: "500",
                }}
              >
                {t.expenseTracking}
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Shield size={26} color={theme.primary} />
              <Text
                style={{
                  color: theme.text,
                  fontSize: 14,
                  marginTop: 8,
                  textAlign: "center",
                  fontWeight: "500",
                }}
              >
                {t.accountSecurity}
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Zap size={26} color={theme.primary} />
              <Text
                style={{
                  color: theme.text,
                  fontSize: 14,
                  marginTop: 8,
                  textAlign: "center",
                  fontWeight: "500",
                }}
              >
                {t.instantInsights}
              </Text>
            </View>
          </Animated.View>

          {/* Get Started Button */}
          <Animated.View
            style={{
              transform: [{ scale: buttonScale }],
              opacity: fadeAnim,
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                paddingVertical: 16,
                paddingHorizontal: 32,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginHorizontal: 20,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
              }}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              onPress={handleNavigate}
            >
              <Text
                style={{
                  color: theme.primaryText,
                  fontSize: 18,
                  fontWeight: "bold",
                  marginRight: 8,
                }}
              >
                {t.startManaging}
              </Text>
              <ArrowRight size={20} color={theme.primaryText} />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </>
  );
}
