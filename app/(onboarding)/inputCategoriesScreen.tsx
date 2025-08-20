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
import { useTheme } from "../../lib/theme";
import { useLanguage } from "../../lib/LanguageProvider";

const categories = [
  {
    id: "accounts",
    titleKey: "accounts",
    descriptionKey: "accountsDescription",
    icon: CreditCard,
    color: "#10b981",
    fields: ["cash", "bank", "cards", "savings"],
  },
  {
    id: "household",
    titleKey: "expenses",
    descriptionKey: "expensesDescription",
    icon: TrendingUp,
    color: "#3b82f6",
    fields: ["food", "rent", "bills", "subscriptions"],
  },
  {
    id: "advanced",
    titleKey: "insights",
    descriptionKey: "insightsDescription",
    icon: BarChart2,
    color: "#8b5cf6",
    fields: ["budgets", "goals", "reports", "trends"],
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
  const theme = useTheme();
  const { t } = useLanguage();
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
        className="flex-1"
      >
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {/* Progress Indicator */}
          <View className="flex-row items-center justify-center gap-1.5 pt-10 px-6">
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
                color: theme.text,
                fontSize: 24,
                fontWeight: "bold",
                marginBottom: 8,
              }}
            >
              {t.accountSetup}
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
                color: theme.textSecondary,
                fontSize: 16,
                lineHeight: 24,
              }}
            >
              {t.accountSetupDescription}
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
                  backgroundColor: theme.cardBackground,
                  borderRadius: 12,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: theme.border,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  position: "relative",
                }}
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
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    },
                  ]}
                >
                  <category.icon size={28} color={category.color} />
                </Animated.View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 18,
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    {t[category.titleKey]}
                  </Text>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 14,
                      marginBottom: 12,
                      lineHeight: 20,
                    }}
                  >
                    {t[category.descriptionKey]}
                  </Text>

                  <View>
                    <Text
                      style={{
                        color: theme.textMuted,
                        fontSize: 12,
                        fontWeight: "500",
                        marginBottom: 4,
                      }}
                    >
                      {t.includes}:
                    </Text>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                    >
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
                            backgroundColor: theme.border,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 4,
                          }}
                        >
                          <Text
                            style={{
                              color: theme.text,
                              fontSize: 12,
                              fontWeight: "500",
                            }}
                          >
                            {t[field]}
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
                            backgroundColor: theme.border,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 4,
                          }}
                        >
                          <Text
                            style={{
                              color: theme.text,
                              fontSize: 12,
                              fontWeight: "500",
                            }}
                          >
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
                    position: "absolute",
                    top: 16,
                    right: 16,
                    width: 24,
                    height: 24,
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: theme.primaryText,
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    {index + 1}
                  </Text>
                </Animated.View>
              </Animated.View>
            ))}
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={{
                marginHorizontal: 24,
                marginBottom: 24,
                backgroundColor: theme.primary,
                paddingVertical: 16,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
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
                  fontSize: 16,
                  fontWeight: "bold",
                  marginRight: 8,
                }}
              >
                {t.continue}
              </Text>
              <ArrowRight size={20} color={theme.primaryText} />
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}
