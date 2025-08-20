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
import { useTheme } from "../../lib/theme";
import { useLanguage } from "../../lib/LanguageProvider";

{
  /* Benefits */
}
const benefitData = [
  {
    icon: BarChart2,
    titleKey: "clearReports",
    descriptionKey: "clearReportsDescription",
  },
  {
    icon: Bell,
    titleKey: "helpfulAlerts",
    descriptionKey: "helpfulAlertsDescription",
  },
  {
    icon: TrendingUp,
    titleKey: "smartInsights",
    descriptionKey: "smartInsightsDescription",
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
  const theme = useTheme();
  const { t } = useLanguage();
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background, overflow: "hidden" }}
    >
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
          flex: 1,
          paddingHorizontal: 24,
          justifyContent: "space-center",
          paddingVertical: 20,
        }}
      >
        {/* Progress Indicator */}
        <View className="flex-row items-center justify-center gap-1.5">
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
          <View
            style={{
              width: 24,
              height: 8,
              backgroundColor: theme.primary,
              borderRadius: 4,
            }}
          />
        </View>

        {/* Motivational Header */}
        <View style={{ alignItems: "center", paddingTop: 0 }}>
          <Animated.View
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
            <ShieldCheck size={56} color={theme.primary} strokeWidth={1.5} />
          </Animated.View>

          <Text
            style={{
              color: theme.text,
              fontSize: 30,
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {t.takeControlOfMoney}
          </Text>
          <Text
            style={{
              color: theme.primary,
              fontSize: 18,
              textAlign: "center",
              fontWeight: "500",
              marginBottom: 4,
            }}
          >
            {t.simpleToolsDescription}
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 16,
              textAlign: "center",
              paddingHorizontal: 16,
            }}
          >
            {t.allFinancesDescription}
          </Text>
        </View>

        {/* Interactive Benefits with staggered entrance */}
        <View style={{ paddingVertical: 16, paddingHorizontal: 8 }}>
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
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: 20,
                backgroundColor: `${theme.cardBackground}66`,
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: `${theme.border}80`,
              }}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: benefitAnimations[index],
                    },
                  ],
                  backgroundColor: `${theme.primary}10`,
                  padding: 12,
                  borderRadius: 20,
                  marginRight: 16,
                }}
              >
                <item.icon size={22} color={theme.primary} />
              </Animated.View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: theme.text, fontSize: 18, fontWeight: "600" }}
                >
                  {t[item.titleKey]}
                </Text>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 14,
                    marginTop: 4,
                  }}
                >
                  {t[item.descriptionKey]}
                </Text>
              </View>
              <ArrowRight
                size={18}
                color={theme.textMuted}
                style={{ marginTop: 4 }}
              />
            </Animated.View>
          ))}
        </View>

        {/* Auth Actions */}
        <View style={{ marginBottom: 24 }}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.primary,
                borderRadius: 12,
                padding: 20,
                marginBottom: 16,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
              }}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              onPress={handleNavigateLogin}
            >
              <Lock size={22} color={theme.primaryText} />
              <Text
                style={{
                  color: theme.primaryText,
                  fontWeight: "bold",
                  fontSize: 18,
                  marginLeft: 12,
                }}
              >
                {t.signIn}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: theme.textSecondary, marginRight: 4 }}>
              {t.newToMoneyManager}
            </Text>
            <TouchableOpacity onPress={handleNavigateSignup}>
              <Text
                style={{ color: theme.primary, fontWeight: "bold", flex: 1 }}
              >
                {t.createAccount}
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
            alignItems: "center",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            {[...Array(5)].map((_, i) => (
              <Animated.Text
                key={i}
                style={{
                  opacity: fadeAnim.interpolate({
                    inputRange: [0, 0.2 * (i + 1), 1],
                    outputRange: [0, 0, 1],
                  }),
                  color: "#fbbf24",
                  fontSize: 18,
                }}
              >
                ★
              </Animated.Text>
            ))}
          </View>
          <Text
            style={{
              color: theme.textMuted,
              fontSize: 12,
              textAlign: "center",
            }}
          >
            {t.helpingUsersText}
          </Text>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}
