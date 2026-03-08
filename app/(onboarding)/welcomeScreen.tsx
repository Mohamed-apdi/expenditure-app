import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { ArrowRight, Wallet } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import { useLanguage, useScreenStatusBar } from "~/lib";
import { APP_COLORS } from "~/lib/config/theme/constants";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const TOP_RATIO = 2 / 3;
const BOTTOM_RATIO = 1 / 3;
const LIGHT_BG = APP_COLORS.inputBg;
const DARK_BG = APP_COLORS.darkCard;
const DASH_INACTIVE = "#4A4A4A";
const ACCENT_COLOR = "#00BFFF";

const SLIDES = [
  { key: "1", icon: "starburst" },
  { key: "2", icon: "bars" },
  { key: "3", icon: "wallet" },
] as const;

/** Eight-pointed asterisk: four intersecting lines with rounded ends (like the image). */
function StarburstIcon() {
  const lineLength = 350;
  const lineThickness = 12;
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: lineLength * 1.2,
          height: lineLength * 1.2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {[0, 45, 90, 135].map((deg) => (
          <View
            key={deg}
            style={{
              position: "absolute",
              width: lineLength,
              height: lineThickness,
              backgroundColor: ACCENT_COLOR,
              borderRadius: lineThickness / 2,
              transform: [{ rotate: `${deg}deg` }],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 3,
              elevation: 3,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function BarsIllustration() {
  const heights = [42, 78, 54, 90, 66, 102, 60, 84, 48, 72, 96];
  const barWidth = 20;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 12,
        height: 220,
      }}
    >
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            width: barWidth,
            height: h,
            backgroundColor: ACCENT_COLOR,
            borderRadius: barWidth / 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.14,
            shadowRadius: 3,
            elevation: 3,
          }}
        />
      ))}
    </View>
  );
}

function WalletIcon() {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: 100,
          height: 100,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "transparent",
        }}
      >
        <Wallet
          size={280}
          color={ACCENT_COLOR}
          strokeWidth={1.5}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 3,
          }}
        />
      </View>
    </View>
  );
}

function SlideIllustration({ type }: { type: (typeof SLIDES)[number]["icon"] }) {
  if (type === "starburst") return <StarburstIcon />;
  if (type === "bars") return <BarsIllustration />;
  return <WalletIcon />;
}

function NextButton({
  onPress,
  progress = 0.75,
}: {
  onPress: () => void;
  progress?: number;
}) {
  const size = 56;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ position: "absolute", width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={ACCENT_COLOR}
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <View
        style={{
          width: size - stroke * 2 - 4,
          height: size - stroke * 2 - 4,
          borderRadius: (size - stroke * 2 - 4) / 2,
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ArrowRight size={22} color="#1F1F1F" strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );
}

const SLIDE_COUNT = SLIDES.length;
const SWIPE_THRESHOLD = 50;

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideOffset = useSharedValue(0);

  const slideTexts = [t.onboardingSlide1, t.onboardingSlide2, t.onboardingSlide3];

  // Sync index to animated offset (no ref/scrollTo — works on Expo 54 / RN 0.81)
  useEffect(() => {
    slideOffset.value = withTiming(-currentIndex * SCREEN_WIDTH, {
      duration: 280,
    });
  }, [currentIndex]);

  const goNext = () => {
    if (currentIndex < SLIDE_COUNT - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.push("/(onboarding)/AuthGateScreen");
    }
  };

  const goToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(SLIDE_COUNT - 1, index));
    setCurrentIndex(clamped);
  };

  const panGesture = Gesture.Pan().onEnd((e) => {
    "worklet";
    const { translationX, velocityX } = e;
    const currentSlide = Math.round(-slideOffset.value / SCREEN_WIDTH);
    if (translationX < -SWIPE_THRESHOLD || velocityX < -200) {
      runOnJS(goToIndex)(Math.min(SLIDE_COUNT - 1, currentSlide + 1));
    } else if (translationX > SWIPE_THRESHOLD || velocityX > 200) {
      runOnJS(goToIndex)(Math.max(0, currentSlide - 1));
    }
  });

  const animatedSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideOffset.value }],
  }));

  const topHeight = SCREEN_HEIGHT * TOP_RATIO;
  const bottomHeight = SCREEN_HEIGHT * BOTTOM_RATIO;

  useScreenStatusBar();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: LIGHT_BG }}>
        {/* Top section: state-driven carousel (Expo 54 safe, no scroll ref) */}
        <GestureDetector gesture={panGesture}>
          <View
            style={{
              height: topHeight,
              width: SCREEN_WIDTH,
              backgroundColor: LIGHT_BG,
              overflow: "hidden",
            }}
          >
            <Animated.View
              style={[
                {
                  flexDirection: "row",
                  height: topHeight,
                  width: SLIDE_COUNT * SCREEN_WIDTH,
                },
                animatedSlideStyle,
              ]}
            >
              {SLIDES.map((item) => (
                <View
                  key={item.key}
                  style={{
                    width: SCREEN_WIDTH,
                    height: topHeight,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 32,
                  }}
                >
                  <SlideIllustration type={item.icon} />
                </View>
              ))}
            </Animated.View>
          </View>
        </GestureDetector>

        {/* Bottom section: dark background, pagination, text, button (like image) */}
        <View
          style={{
            height: bottomHeight,
            backgroundColor: DARK_BG,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: Math.max(32, insets.bottom),
            justifyContent: "space-between",
          }}
        >
          {/* Pagination: 3 horizontal dashes, active = yellow, rest = grey */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: 32,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: i === currentIndex ? ACCENT_COLOR : DASH_INACTIVE,
                }}
              />
            ))}
          </View>

          {/* Main text: white, bold, left-aligned */}
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 24,
              fontWeight: "700",
              lineHeight: 32,
              paddingRight: 72,
            }}
            numberOfLines={3}
          >
            {slideTexts[currentIndex]}
          </Text>

          {/* Next: circular button, yellow outline, white fill, black arrow */}
          <View style={{ alignItems: "flex-end", marginTop: 8 }}>
            <NextButton onPress={goNext} />
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
