import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import { CategoryPickerSheet } from "~/components/CategoryPickerSheet";
import { useLanguage } from "~/lib";
import {
  getExpenseCategories,
  type Category,
} from "~/lib/utils/categories";
import { applyUserEvcCategory } from "~/lib/evc/applyUserEvcCategory";
import { EVC_QUICK_CATEGORY_IDS } from "~/lib/evc/evcQuickCategoryIds";
import { getMemoryCategoryByNormalizedPhone } from "~/lib/stores/categoryMemoryStore";
import { useTheme } from "~/lib";

type Props = {
  userId: string;
  transactionId: string;
  normalizedPhone?: string | null;
  onApplied?: () => void;
  compact?: boolean;
};

function withAlpha(hex: string, alphaHex: string): string {
  const h = hex.replace("#", "");
  if (h.length === 6) return `#${h}${alphaHex}`;
  return hex;
}

export function EvcCategoryChips({
  userId,
  transactionId,
  normalizedPhone,
  onApplied,
  compact,
}: Props) {
  const { t } = useLanguage();
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [fullPickerOpen, setFullPickerOpen] = useState(false);

  const categories = useMemo(() => getExpenseCategories(t), [t]);
  const chips = useMemo(() => {
    return EVC_QUICK_CATEGORY_IDS.map((id) => {
      const cat = categories.find((c) => c.id === id);
      return cat ? { id, label: cat.name, Icon: cat.icon } : null;
    }).filter(Boolean) as {
      id: string;
      label: string;
      Icon: Category["icon"];
    }[];
  }, [categories]);

  const memoryCat =
    normalizedPhone && userId
      ? getMemoryCategoryByNormalizedPhone(userId, normalizedPhone)
      : null;

  /** Suggested from memory: same icons as category lists. */
  const suggestedBanner = useMemo(() => {
    if (!memoryCat) return null;
    const quick = chips.find((c) => c.id === memoryCat);
    if (quick) return { label: quick.label, Icon: quick.Icon };
    const full = categories.find((c) => c.id === memoryCat);
    if (full) return { label: full.name, Icon: full.icon };
    return null;
  }, [memoryCat, chips, categories]);

  const numCols = compact ? 2 : 3;
  const gap = compact ? 8 : 10;
  /** Scroll padding + card padding (transaction detail / list row). */
  const horizontalGutter = 64;
  const chipWidth = Math.max(
    96,
    (windowWidth - horizontalGutter - gap * (numCols - 1)) / numCols,
  );

  const onPick = useCallback(
    async (chipId: string) => {
      setPressedId(chipId);
      setBusyId(chipId);
      try {
        const ok = await applyUserEvcCategory({
          userId,
          transactionId,
          categoryId: chipId,
        });
        if (ok) onApplied?.();
        else setPressedId(null);
      } finally {
        setBusyId(null);
      }
    },
    [userId, transactionId, onApplied],
  );

  const handleFullCategorySelect = useCallback(
    async (category: Category) => {
      setPressedId(category.id);
      setBusyId(category.id);
      try {
        const ok = await applyUserEvcCategory({
          userId,
          transactionId,
          categoryId: category.id,
        });
        if (ok) onApplied?.();
        else setPressedId(null);
      } finally {
        setBusyId(null);
      }
    },
    [userId, transactionId, onApplied],
  );

  const titleSize = compact ? 14 : 17;
  const subtitleSize = compact ? 11 : 13;
  const chipPadV = compact ? 10 : 12;
  const chipPadH = compact ? 10 : 12;
  const chipRadius = compact ? 12 : 14;
  const chipIconSize = compact ? 17 : 19;

  return (
    <View style={{ marginTop: compact ? 2 : 0 }}>
      <Text
        style={{
          fontSize: titleSize,
          fontWeight: "700",
          color: theme.text,
          marginBottom: compact ? 4 : 6,
        }}
      >
        {t.evcCategorizeTitle}
      </Text>
      {!compact ? (
        <Text
          style={{
            fontSize: subtitleSize,
            color: theme.textSecondary,
            lineHeight: subtitleSize + 5,
            marginBottom: 16,
          }}
        >
          {t.evcCategorizeSubtitle}
        </Text>
      ) : (
        <View style={{ height: 8 }} />
      )}

      {suggestedBanner ? (
        <View
          style={{
            marginBottom: 14,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: chipRadius,
            backgroundColor: withAlpha(theme.primary, "18"),
            borderWidth: 1,
            borderColor: withAlpha(theme.primary, "44"),
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <Text
              style={{
                fontSize: compact ? 12 : 13,
                fontWeight: "600",
                color: theme.text,
              }}
            >
              {t.evcSuggested}:
            </Text>
            {React.createElement(suggestedBanner.Icon, {
              size: compact ? 15 : 16,
              color: theme.primary,
            })}
            <Text
              style={{
                fontSize: compact ? 12 : 13,
                fontWeight: "600",
                color: theme.text,
                flexShrink: 1,
              }}
            >
              {suggestedBanner.label}
            </Text>
          </View>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap,
        }}
      >
        {chips.map((c) => {
          const ChipIcon = c.Icon;
          const isBusy = busyId === c.id;
          const isSelected = pressedId === c.id || isBusy;
          const isSuggestedOnly =
            !!memoryCat && memoryCat === c.id && !isSelected;

          const bg = isSelected
            ? theme.primary
            : isSuggestedOnly
              ? withAlpha(theme.primary, "14")
              : theme.cardBackground;

          const border = isSelected
            ? theme.primary
            : isSuggestedOnly
              ? withAlpha(theme.primary, "55")
              : theme.border;

          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => onPick(c.id)}
              disabled={!!busyId}
              activeOpacity={0.85}
              style={{
                width: chipWidth,
                paddingVertical: chipPadV,
                paddingHorizontal: chipPadH,
                borderRadius: chipRadius,
                backgroundColor: bg,
                borderWidth: 1,
                borderColor: border,
                alignItems: "center",
                justifyContent: "center",
                minHeight: compact ? 44 : 48,
              }}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color={theme.primaryText} />
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    width: "100%",
                  }}
                >
                  <ChipIcon
                    size={chipIconSize}
                    color={isSelected ? theme.primaryText : theme.text}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: compact ? 12 : 13,
                      fontWeight: isSelected ? "700" : "500",
                      color: isSelected ? theme.primaryText : theme.text,
                      textAlign: "left",
                    }}
                    numberOfLines={2}
                  >
                    {c.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={() => setFullPickerOpen(true)}
        disabled={!!busyId}
        activeOpacity={0.75}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginTop: compact ? 12 : 14,
          paddingVertical: compact ? 10 : 12,
          paddingHorizontal: 12,
          borderRadius: chipRadius,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.cardBackground,
        }}
      >
        <Text
          style={{
            fontSize: compact ? 13 : 14,
            fontWeight: "600",
            color: theme.primary,
            marginRight: 4,
          }}
        >
          {t.evcMoreCategories}
        </Text>
        <ChevronRight size={compact ? 18 : 20} color={theme.primary} />
      </TouchableOpacity>

      <CategoryPickerSheet
        visible={fullPickerOpen}
        onClose={() => setFullPickerOpen(false)}
        categories={categories}
        onSelect={(cat) => {
          void handleFullCategorySelect(cat);
        }}
      />
    </View>
  );
}
