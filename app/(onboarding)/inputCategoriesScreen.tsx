import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  CreditCard,
  TrendingUp,
  ArrowRight,
  BarChart2,
} from "lucide-react-native";
import { useEffect, useRef } from "react";

const categories = [
  {
    id: "accounts",
    title: "Accounts",
    description: "Cash, bank, cards, and savings balances",
    icon: CreditCard,
    color: "#10b981",
    fields: ["Cash", "Bank", "Cards", "Savings"],
  },
  {
    id: "household",
    title: "Expenses",
    description: "Daily spending, bills, and recurring payments",
    icon: TrendingUp,
    color: "#3b82f6",
    fields: ["Food", "Rent", "Bills", "Subscriptions"],
  },
  {
    id: "advanced",
    title: "Insights",
    description: "Budgets, goals, and financial reports",
    icon: BarChart2,
    color: "#8b5cf6",
    fields: ["Budgets", "Goals", "Reports", "Trends"],
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

export default function InputCategoriesScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const categoryAnimations = useRef(
    categories.map(() => new Animated.Value(0))
  ).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const screenTransition = useRef(new Animated.Value(0)).current;

  // Generate random particles
  const particles = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    size: 2 + Math.random() * 3,
    left: Math.random() * 100,
    top: 10 + Math.random() * 80,
  }));

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Staggered category animations
    Animated.stagger(
      150,
      categoryAnimations.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        })
      )
    ).start();

    // Progress width animation (non-native)
    Animated.timing(progressWidth, {
      toValue: 100,
      duration: 1000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false, // Width animation can't use native driver
    }).start();
  }, []);

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
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

  const handleNavigate = () => {
    // Start screen transition animation
    Animated.timing(screenTransition, {
      toValue: 1,
      duration: 400,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      // Navigate after animation completes
      router.push("/AuthGateScreen");
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
        className="flex-1"
      >
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {/* Progress Indicator */}
          <View className="flex-row items-center justify-center gap-1.5 pt-10 px-6">
            <View className="w-2 h-2 bg-white/30 rounded-full" />
            <View className="w-6 h-2 bg-emerald-400 rounded-full" />
            <View className="w-2 h-2 bg-white/30 rounded-full" />
          </View>

          {/* Title and Tagline */}
          <View className="px-6 py-5">
            <Animated.Text
              style={{
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              }}
              className="text-white text-2xl font-bold mb-2"
            >
              Account Setup
            </Animated.Text>
            <Animated.Text
              style={{
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              }}
              className="text-slate-400 text-base leading-6"
            >
              Choose what you want to manage — accounts, expenses, and more
            </Animated.Text>
          </View>

          <View className="px-6 gap-4 mb-6">
            {categories.map((category, index) => (
              <Animated.View
                key={category.id}
                style={{
                  opacity: categoryAnimations[index],
                  transform: [
                    {
                      translateY: categoryAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                }}
                className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex-row items-start relative"
              >
                <Animated.View
                  style={[
                    {
                      transform: [
                        {
                          scale: categoryAnimations[index],
                        },
                      ],
                      backgroundColor: `${category.color}20`,
                    },
                  ]}
                  className="w-14 h-14 rounded-lg justify-center items-center mr-4"
                >
                  <category.icon size={28} color={category.color} />
                </Animated.View>

                <View className="flex-1">
                  <Text className="text-white text-lg font-bold mb-1">
                    {category.title}
                  </Text>
                  <Text className="text-slate-400 text-sm mb-3 leading-5">
                    {category.description}
                  </Text>

                  <View>
                    <Text className="text-slate-500 text-xs font-medium mb-1">
                      Includes:
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {category.fields.slice(0, 3).map((field, idx) => (
                        <Animated.View
                          key={idx}
                          style={{
                            opacity: categoryAnimations[index],
                            transform: [
                              {
                                scale: categoryAnimations[index].interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.5, 1],
                                }),
                              },
                            ],
                          }}
                          className="bg-slate-700 px-2 py-1 rounded"
                        >
                          <Text className="text-slate-200 text-xs font-medium">
                            {field}
                          </Text>
                        </Animated.View>
                      ))}
                      {category.fields.length > 3 && (
                        <Animated.View
                          style={{
                            opacity: categoryAnimations[index],
                            transform: [
                              {
                                scale: categoryAnimations[index].interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.5, 1],
                                }),
                              },
                            ],
                          }}
                          className="bg-slate-700 px-2 py-1 rounded"
                        >
                          <Text className="text-slate-200 text-xs font-medium">
                            +{category.fields.length - 3}
                          </Text>
                        </Animated.View>
                      )}
                    </View>
                  </View>
                </View>

                <Animated.View
                  style={{
                    transform: [
                      {
                        scale: categoryAnimations[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                        }),
                      },
                    ],
                  }}
                  className="absolute top-4 right-4 w-6 h-6 bg-emerald-500 rounded-full justify-center items-center"
                >
                  <Text className="text-white text-xs font-bold">
                    {index + 1}
                  </Text>
                </Animated.View>
              </Animated.View>
            ))}
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              className="mx-6 mb-6 bg-emerald-500 py-4 rounded-xl flex-row items-center justify-center shadow-lg shadow-emerald-500/30"
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              onPress={handleNavigate}
            >
              <Text className="text-white text-base font-bold mr-2">
                Continue
              </Text>
              <ArrowRight size={20} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}
