import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ChevronRight, LayoutGrid } from "lucide-react-native";
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
  /** When true, show collapsible optional note below quick categories (bottom sheet flow). */
  enableOptionalNote?: boolean;
  /** Notifies parent when optional note section expands (e.g. enable sheet scroll). */
  onNoteExpandedChange?: (expanded: boolean) => void;
  /** Called when the optional note field receives focus (e.g. scroll sheet). */
  onNoteInputFocus?: () => void;
};

function withAlpha(hex: string, alphaHex: string): string {
  const h = hex.replace("#", "");
  if (h.length === 6) return `#${h}${alphaHex}`;
  return hex;
}

/** Soft icon backgrounds for quick-pick categories (bottom sheet). */
const QUICK_CATEGORY_COLORS: Record<
  string,
  { bg: string; icon: string }
> = {
  transport: { bg: "#DBEAFE", icon: "#2563EB" },
  food: { bg: "#FFEDD5", icon: "#EA580C" },
  family: { bg: "#EDE9FE", icon: "#7C3AED" },
  utilities: { bg: "#FEF9C3", icon: "#CA8A04" },
  others: { bg: "#F3F4F6", icon: "#6B7280" },
};

const DEFAULT_QUICK_COLORS = { bg: "#F3F4F6", icon: "#6B7280" };

export function EvcCategoryChips({
  userId,
  transactionId,
  normalizedPhone,
  onApplied,
  compact,
  enableOptionalNote = false,
  onNoteExpandedChange,
  onNoteInputFocus,
}: Props) {
  const { t } = useLanguage();
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [fullPickerOpen, setFullPickerOpen] = useState(false);
  const sheetMode = enableOptionalNote && !compact;
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [draftNote, setDraftNote] = useState("");

  const categories = useMemo(() => getExpenseCategories(t), [t]);
  const chips = useMemo(() => {
    return EVC_QUICK_CATEGORY_IDS.map((id) => {
      const cat = categories.find((c) => c.id === id);
      if (!cat) return null;
      return { id, label: cat.name, Icon: cat.icon };
    }).filter(Boolean) as {
      id: string;
      label: string;
      Icon: Category["icon"];
    }[];
  }, [categories, t]);

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

  const numCols = compact ? 2 : sheetMode ? 2 : 3;
  const gap = compact ? 8 : sheetMode ? 8 : 12;
  /** Scroll padding + card padding (transaction detail / list row / sheet). */
  const horizontalGutter = sheetMode ? 40 : 64;
  const rawChipWidth =
    (windowWidth - horizontalGutter - gap * (numCols - 1)) / numCols;
  const chipWidth = sheetMode
    ? Math.min(118, Math.max(88, rawChipWidth))
    : Math.max(96, rawChipWidth);
  const iconCircleSize = sheetMode ? 34 : 36;

  const userNoteForApply = enableOptionalNote
    ? draftNote.trim() || undefined
    : undefined;

  const onPick = useCallback(
    async (chipId: string) => {
      setPressedId(chipId);
      setBusyId(chipId);
      try {
        const ok = await applyUserEvcCategory({
          userId,
          transactionId,
          categoryId: chipId,
          userNote: userNoteForApply,
        });
        if (ok) onApplied?.();
        else setPressedId(null);
      } finally {
        setBusyId(null);
      }
    },
    [userId, transactionId, onApplied, userNoteForApply],
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
          userNote: userNoteForApply,
        });
        if (ok) onApplied?.();
        else setPressedId(null);
      } finally {
        setBusyId(null);
      }
    },
    [userId, transactionId, onApplied, userNoteForApply],
  );

  const titleSize = compact ? 14 : 19;
  const subtitleSize = compact ? 11 : 13;
  const chipPadV = compact ? 10 : sheetMode ? 8 : 14;
  const chipPadH = compact ? 10 : sheetMode ? 6 : 8;
  const chipRadius = compact ? 12 : sheetMode ? 12 : 14;
  const chipIconSize = compact ? 17 : sheetMode ? 17 : 22;
  const chipLabelSize = compact ? 12 : sheetMode ? 11 : 13;

  const renderChip = (c: (typeof chips)[number]) => {
    const ChipIcon = c.Icon;
    const isBusy = busyId === c.id;
    const isSelected = pressedId === c.id || isBusy;
    const isSuggestedOnly = !!memoryCat && memoryCat === c.id && !isSelected;
    const palette = QUICK_CATEGORY_COLORS[c.id] ?? DEFAULT_QUICK_COLORS;

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

    const iconBg = isSelected ? withAlpha("#FFFFFF", "33") : palette.bg;
    const iconColor = isSelected ? theme.primaryText : palette.icon;

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
          minHeight: sheetMode ? 68 : compact ? 44 : 48,
        }}
      >
        {isBusy ? (
          <ActivityIndicator size="small" color={theme.primaryText} />
        ) : sheetMode ? (
          <>
            <View
              style={{
                width: iconCircleSize,
                height: iconCircleSize,
                borderRadius: iconCircleSize / 2,
                backgroundColor: iconBg,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
            >
              <ChipIcon size={chipIconSize} color={iconColor} />
            </View>
            <Text
              style={{
                fontSize: chipLabelSize,
                fontWeight: isSelected ? "700" : "600",
                color: isSelected ? theme.primaryText : theme.text,
                textAlign: "center",
              }}
              numberOfLines={2}
            >
              {c.label}
            </Text>
          </>
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
  };

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

      {sheetMode ? (
        <View style={{ gap, alignItems: "center" }}>
          <View style={{ flexDirection: "row", gap, justifyContent: "center" }}>
            {chips.slice(0, 2).map(renderChip)}
          </View>
          <View style={{ flexDirection: "row", gap, justifyContent: "center" }}>
            {chips.slice(2, 4).map(renderChip)}
          </View>
        </View>
      ) : (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap,
          }}
        >
          {chips.map(renderChip)}
        </View>
      )}

      {enableOptionalNote ? (
        <View style={{ marginTop: sheetMode ? 20 : compact ? 10 : 12 }}>
          {!noteExpanded ? (
            <TouchableOpacity
              onPress={() => {
                setNoteExpanded(true);
                onNoteExpandedChange?.(true);
              }}
              disabled={!!busyId}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text
                style={{
                  fontSize: compact ? 13 : 14,
                  fontWeight: "500",
                  color: theme.primary,
                }}
              >
                {t.evcAddNoteOptional}
              </Text>
            </TouchableOpacity>
          ) : (
            <View>
              <Text
                style={{
                  fontSize: compact ? 12 : 13,
                  fontWeight: "600",
                  color: theme.textSecondary,
                  marginBottom: 8,
                }}
              >
                {t.evcNoteLabel}
              </Text>
              <TextInput
                value={draftNote}
                onChangeText={setDraftNote}
                onFocus={() => onNoteInputFocus?.()}
                placeholder={t.evcNotePlaceholder}
                placeholderTextColor={theme.textSecondary}
                multiline
                editable={!busyId}
                scrollEnabled={false}
                style={{
                  minHeight: sheetMode ? 48 : compact ? 40 : 44,
                  maxHeight: 100,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: chipRadius,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  color: theme.text,
                  fontSize: compact ? 14 : 15,
                  textAlignVertical: "top",
                }}
              />
            </View>
          )}
        </View>
      ) : null}

      <View
        style={{
          marginTop: sheetMode ? 20 : compact ? 12 : 14,
          paddingTop: sheetMode ? 16 : 0,
          borderTopWidth: sheetMode ? 1 : 0,
          borderTopColor: theme.border,
        }}
      >
        <TouchableOpacity
          onPress={() => setFullPickerOpen(true)}
          disabled={!!busyId}
          activeOpacity={0.75}
          style={{
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            paddingVertical: sheetMode ? 14 : compact ? 10 : 12,
            paddingHorizontal: sheetMode ? 16 : 12,
            borderRadius: chipRadius,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.cardBackground,
          }}
        >
          {sheetMode ? (
            <LayoutGrid size={20} color={theme.primary} />
          ) : null}
          <Text
            style={{
              flex: sheetMode ? 1 : undefined,
              fontSize: sheetMode ? 15 : compact ? 13 : 14,
              fontWeight: "600",
              color: sheetMode ? theme.text : theme.primary,
              marginLeft: sheetMode ? 12 : 0,
              marginRight: sheetMode ? 0 : 4,
              textAlign: sheetMode ? "left" : "center",
            }}
          >
            {t.evcMoreCategories}
          </Text>
          <ChevronRight
            size={sheetMode ? 20 : compact ? 18 : 20}
            color={theme.primary}
          />
        </TouchableOpacity>
      </View>

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
