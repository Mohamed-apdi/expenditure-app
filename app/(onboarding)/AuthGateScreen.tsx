import { View, Text, TouchableOpacity, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ShieldCheck,
  BarChart2,
  Bell,
  TrendingUp,
  Lock,
  ArrowRight,
} from "lucide-react-native";
import { useEffect, useRef } from "react";

{
  /* Benefits */
}
const benefitData = [
  {
    icon: BarChart2,
    title: "Clear Reports",
    description: "See where your money goes with easy breakdowns",
  },
  {
    icon: Bell,
    title: "Helpful Alerts",
    description: "Stay on top of bills and daily spending",
  },
  {
    icon: TrendingUp,
    title: "Smart Insights",
    description: "Discover trends and plan your savings goals",
  },
];

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

export default function AuthGateScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const benefitAnimations = useRef(
    benefitData.map(() => new Animated.Value(0))
  ).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
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

    // Staggered benefits animation
    Animated.stagger(
      200,
      benefitAnimations.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        })
      )
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

  const handleNavigateLogin = () => {
    // Start screen transition animation
    Animated.timing(screenTransition, {
      toValue: 1,
      duration: 400,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      // Navigate after animation completes
      router.push("/login");
    });
  };

  const handleNavigateSignup = () => {
    // Start screen transition animation
    Animated.timing(screenTransition, {
      toValue: 1,
      duration: 400,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      // Navigate after animation completes
      router.push("/signup");
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
    <SafeAreaView className="flex-1 bg-slate-900 overflow-hidden">
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
        className="flex-1 px-6  justify-between py-5"
      >
        {/* Progress Indicator */}
        <View className="flex-row items-center justify-center gap-1.5 pt-5">
          <View className="w-2 h-2 bg-white/30 rounded-full" />
          <View className="w-2 h-2 bg-white/30 rounded-full" />
          <View className="w-6 h-2 bg-emerald-400 rounded-full" />
        </View>
        {/* Motivational Header with pulse animation */}
        {/* Motivational Header */}
        <View className="items-center pt-0">
          <Animated.View
            className="w-28 h-28 bg-emerald-500/10 rounded-full justify-center items-center mb-6 
              border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
            style={{
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            }}
          >
            <ShieldCheck size={56} color="#10b981" strokeWidth={1.5} />
          </Animated.View>

          <Text className="text-white text-3xl font-bold text-center mb-2">
            Take Control of Your Money
          </Text>
          <Text className="text-emerald-400 text-lg text-center font-medium mb-1">
            Simple tools to track spending, accounts, and savings
          </Text>
          <Text className="text-slate-400 text-base text-center px-4">
            All your finances in one place — secure and private
          </Text>
        </View>

        {/* Interactive Benefits with staggered entrance */}
        <View className="py-4 px-2">
          {benefitData.map((item, index) => (
            <Animated.View
              key={index}
              style={{
                transform: [
                  {
                    translateX: benefitAnimations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
                opacity: benefitAnimations[index],
              }}
              className="flex-row items-start mb-5 bg-slate-800/40 p-4 rounded-xl 
                        border border-slate-700/50"
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: benefitAnimations[index],
                    },
                  ],
                }}
                className="bg-emerald-500/10 p-3 rounded-full mr-4"
              >
                <item.icon size={22} color="#10b981" />
              </Animated.View>
              <View className="flex-1">
                <Text className="text-white text-lg font-semibold">
                  {item.title}
                </Text>
                <Text className="text-slate-400 text-sm mt-1">
                  {item.description}
                </Text>
              </View>
              <ArrowRight size={18} color="#64748b" className="mt-1" />
            </Animated.View>
          ))}
        </View>

        {/* Auth Actions */}
        <View className="mb-6">
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              className="flex-row items-center justify-center bg-emerald-500 rounded-xl p-5 mb-4
                shadow-lg shadow-emerald-500/30"
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              onPress={handleNavigateLogin}
            >
              <Lock size={22} color="#ffffff" />
              <Text className="text-white font-bold text-lg ml-3">Sign In</Text>
            </TouchableOpacity>
          </Animated.View>

          <View className="flex-row justify-center items-center">
            <Text className="text-slate-400 mr-1">New to Money Manager?</Text>
            <TouchableOpacity onPress={handleNavigateSignup}>
              <Text className="text-emerald-400 font-bold flex-1">
                Create Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Trust Indicator */}
        <Animated.View
          style={{
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
          }}
          className="items-center pb-4"
        >
          <View className="flex-row items-center mb-2">
            {[...Array(5)].map((_, i) => (
              <Animated.Text
                key={i}
                style={{
                  opacity: fadeAnim.interpolate({
                    inputRange: [0, 0.2 * (i + 1), 1],
                    outputRange: [0, 0, 1],
                  }),
                }}
                className="text-yellow-400 text-lg"
              >
                ★
              </Animated.Text>
            ))}
          </View>
          <Text className="text-slate-500 text-xs text-center">
            Helping users manage money securely every day
          </Text>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}
