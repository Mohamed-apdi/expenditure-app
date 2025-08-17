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
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-slate-900">
        {/* Floating particles background */}
        {particles.map((particle) => (
          <FloatingParticle
            key={particle.id}
            style={{
              width: particle.size,
              height: particle.size,
              borderRadius: particle.size / 2,
              backgroundColor: "#10b981",
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
            <View className="w-6 h-2 bg-emerald-400 rounded-full" />
            <View className="w-2 h-2 bg-white/30 rounded-full" />
            <View className="w-2 h-2 bg-white/30 rounded-full" />
          </View>

          {/* Hero Illustration */}
          <View className="items-center mt-10">
            <Animated.View
              style={{
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
              }}
              className="w-48 h-48 bg-slate-800 rounded-full justify-center items-center border-2 border-emerald-500/50 relative shadow-xl shadow-emerald-500/20"
            >
              <Animated.View
                style={{ transform: [{ rotate: rotateInterpolate }] }}
              >
                <PieChart size={80} color="#10b981" strokeWidth={1.8} />
              </Animated.View>
              <Animated.View
                style={{
                  transform: [{ scale: scaleAnim }],
                  opacity: fadeAnim,
                }}
                className="absolute bottom-[-20px] right-5 bg-emerald-400 rounded-xl p-2 shadow-md shadow-black/30"
              >
                <DollarSign size={40} color="#fff" />
              </Animated.View>
            </Animated.View>
          </View>

          {/* Title and Tagline */}
          <Animated.View
            style={{
              transform: [{ translateY: slideUpAnim }],
              opacity: fadeAnim,
            }}
            className="items-center px-5"
          >
            <Text className="text-white text-3xl font-bold text-center mb-4">
              Qoondeeye
            </Text>
            <Text className="text-emerald-400 text-lg text-center font-semibold mb-3">
              Track accounts, expenses, and transfers with ease
            </Text>
            <Text className="text-slate-400 text-base text-center leading-6">
              Manage balances across cash, bank, cards, and savings in one place
            </Text>
          </Animated.View>

          {/* Features */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            }}
            className="flex-row justify-around px-5"
          >
            <View className="items-center flex-1">
              <TrendingUp size={26} color="#10b981" />
              <Text className="text-slate-200 text-sm mt-2 text-center font-medium">
                Expense Tracking
              </Text>
            </View>
            <View className="items-center flex-1">
              <Shield size={26} color="#10b981" />
              <Text className="text-slate-200 text-sm mt-2 text-center font-medium">
                Account Security
              </Text>
            </View>
            <View className="items-center flex-1">
              <Zap size={26} color="#10b981" />
              <Text className="text-slate-200 text-sm mt-2 text-center font-medium">
                Instant Insights
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
              className="bg-emerald-500 py-4 px-8 rounded-xl flex-row items-center justify-center mx-5 shadow-lg shadow-emerald-500/30"
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              onPress={handleNavigate}
            >
              <Text className="text-white text-lg font-bold mr-2">
                Start Managing
              </Text>
              <ArrowRight size={20} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </>
  );
}
