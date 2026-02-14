import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
              backgroundColor: "#1A1A1A",
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
            backgroundColor: "#2D2D2D",
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
          color="#1A1A1A"
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
            stroke={APP_COLORS.yellow}
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

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const slideTexts = [t.onboardingSlide1, t.onboardingSlide2, t.onboardingSlide3];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    if (index >= 0 && index <= 2) setCurrentIndex(index);
  };

  const goNext = () => {
    if (currentIndex < 2) {
      flatListRef.current?.scrollToOffset({
        offset: (currentIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      router.push("/(onboarding)/AuthGateScreen");
    }
  };

  const topHeight = SCREEN_HEIGHT * TOP_RATIO;
  const bottomHeight = SCREEN_HEIGHT * BOTTOM_RATIO;

  useScreenStatusBar();

  return (
    <>
      <View style={{ flex: 1, backgroundColor: LIGHT_BG }}>
        {/* Top section: light background, illustrations */}
        <View style={{ height: topHeight, backgroundColor: LIGHT_BG }}>
          <FlatList
            ref={flatListRef}
            data={SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
            scrollEventThrottle={16}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ height: topHeight }}
            renderItem={({ item }) => (
              <View
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
            )}
          />
        </View>

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
                  backgroundColor: i === currentIndex ? APP_COLORS.yellow : DASH_INACTIVE,
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
    </>
  );
}
