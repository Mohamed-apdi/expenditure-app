/**
 * Full-screen SMS import account mapping (same storage / resolver as before).
 */
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useCallback, useState, type ReactNode } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  Globe,
  Smartphone,
  CreditCard,
  Radio,
  Landmark,
} from "lucide-react-native";
import { getCurrentUserOfflineFirst } from "~/lib";
import {
  getSmsImportSettings,
  saveSmsImportSettings,
  type SmsImportUserSettings,
} from "~/lib/services/smsImportSettings";
import { useTheme, useScreenStatusBar, useLanguage, useAccount } from "~/lib";

type SmsAccountPick =
  | { kind: "global_default" }
  | {
      kind: "provider";
      provider: "evc" | "somnet_jeeb" | "salaam_bank";
      field: "default" | "sim1" | "sim2";
    };

function SectionLabel({ text, theme }: { text: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <Text
      style={{
        color: theme.textSecondary,
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 10,
        marginLeft: 4,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {text}
    </Text>
  );
}

function Card({
  children,
  theme,
}: {
  children: ReactNode;
  theme: ReturnType<typeof useTheme>;
}) {
  const shadow =
    Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.isDark ? 0.35 : 0.06,
          shadowRadius: 10,
        }
      : { elevation: theme.isDark ? 3 : 2 };

  return (
    <View
      style={{
        backgroundColor: theme.cardBackground,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        overflow: "hidden",
        marginBottom: 20,
        ...shadow,
      }}
    >
      {children}
    </View>
  );
}

function RowDivider({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 74 }} />;
}

function MappingRow({
  theme,
  icon,
  iconBg,
  title,
  valueLabel,
  hint,
  isPlaceholder,
  onPress,
}: {
  theme: ReturnType<typeof useTheme>;
  icon: ReactNode;
  iconBg: string;
  title: string;
  valueLabel: string;
  hint: string;
  /** True when no account is mapped (shows muted "Not set" styling). */
  isPlaceholder: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.65}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: iconBg,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 14,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }} numberOfLines={2}>
          {title}
        </Text>
        <Text
          style={{
            color: isPlaceholder ? theme.textMuted : theme.primary,
            fontSize: 14,
            fontWeight: "600",
            marginTop: 3,
          }}
          numberOfLines={1}
        >
          {valueLabel}
        </Text>
        {hint ? (
          <Text
            style={{
              color: theme.textMuted,
              fontSize: 12,
              marginTop: 6,
              lineHeight: 17,
            }}
            numberOfLines={4}
          >
            {hint}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={20} color={theme.textMuted} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
}

/** Same visual style as the former static advanced banner; tap to expand/collapse SIM rows. */
function AdvancedSimToggleRow({
  theme,
  label,
  expanded,
  onToggle,
  showLabel,
  hideLabel,
}: {
  theme: ReturnType<typeof useTheme>;
  label: string;
  expanded: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${label}. ${expanded ? hideLabel : showLabel}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 11,
        paddingHorizontal: 16,
        backgroundColor: theme.isDark ? theme.primary + "14" : theme.primary + "0D",
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme.border,
        gap: 12,
      }}
    >
      <Text
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: "600",
          color: theme.textSecondary,
          letterSpacing: 0.2,
        }}
        numberOfLines={2}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: "700", color: theme.primary }}>
        {expanded ? hideLabel : showLabel}
      </Text>
    </TouchableOpacity>
  );
}

export default function SmsImportAccountsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useLanguage();
  const { accounts } = useAccount();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  useScreenStatusBar();

  const [smsSettings, setSmsSettings] = useState<SmsImportUserSettings | null>(null);
  const [accountPick, setAccountPick] = useState<SmsAccountPick | null>(null);
  const [evcAdvancedExpanded, setEvcAdvancedExpanded] = useState(false);
  const [somnetAdvancedExpanded, setSomnetAdvancedExpanded] = useState(false);

  const refreshSmsImportSettings = useCallback(async () => {
    try {
      const user = await getCurrentUserOfflineFirst();
      if (!user) return;
      const s = await getSmsImportSettings(user.id);
      setSmsSettings(s);
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSmsImportSettings();
    }, [refreshSmsImportSettings]),
  );

  const accountNameById = useCallback(
    (id: string | null) => {
      if (!id) return null;
      return accounts.find((a) => a.id === id)?.name ?? null;
    },
    [accounts],
  );

  const displayAccount = (id: string | null) =>
    accountNameById(id) ?? t.smsImportNotSetShort;

  const saveSmsAccountPick = useCallback(
    async (pick: SmsAccountPick, accountId: string | null) => {
      const user = await getCurrentUserOfflineFirst();
      if (!user) return;
      const cur = smsSettings ?? (await getSmsImportSettings(user.id));
      const next: SmsImportUserSettings = { ...cur };
      if (pick.kind === "global_default") {
        next.globalDefaultAccountId = accountId;
      } else {
        const slice = next[pick.provider];
        const withAccount =
          pick.field === "default"
            ? { ...slice, defaultAccountId: accountId }
            : pick.field === "sim1"
              ? { ...slice, sim1AccountId: accountId }
              : { ...slice, sim2AccountId: accountId };
        next[pick.provider] =
          accountId != null ? { ...withAccount, enabled: true } : withAccount;
      }
      await saveSmsImportSettings(user.id, next);
      await refreshSmsImportSettings();
    },
    [smsSettings, refreshSmsImportSettings],
  );

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/SettingScreen");
    }
  }, [router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          backgroundColor: theme.background,
        }}
      >
        <TouchableOpacity
          onPress={handleGoBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: theme.cardBackground,
            borderWidth: 1,
            borderColor: theme.border,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 20,
              fontWeight: "700",
              letterSpacing: -0.35,
            }}
            numberOfLines={1}
          >
            {t.smsImportMappingTitle}
          </Text>
        </View>
      </View>

      {!smsSettings ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: tabBarHeight + 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: theme.isDark ? theme.primary + "12" : theme.primary + "08",
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.isDark ? theme.primary + "28" : theme.primary + "18",
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 14,
                lineHeight: 22,
              }}
            >
              {t.smsImportMappingSubtitle}
            </Text>
          </View>

          <SectionLabel text={t.smsMapSectionAllProviders} theme={theme} />
          <Card theme={theme}>
            <MappingRow
              theme={theme}
              icon={<Globe size={22} color={theme.primary} />}
              iconBg={theme.isDark ? theme.primary + "22" : theme.primary + "18"}
              title={t.smsMapGlobalDefaultTitle}
              valueLabel={displayAccount(smsSettings.globalDefaultAccountId)}
              hint={t.smsMapGlobalDefaultHint}
              isPlaceholder={!smsSettings.globalDefaultAccountId}
              onPress={() => setAccountPick({ kind: "global_default" })}
            />
          </Card>

          <SectionLabel text={t.smsMapSectionEvc} theme={theme} />
          <Card theme={theme}>
            <MappingRow
              theme={theme}
              icon={<Smartphone size={22} color="#16a34a" />}
              iconBg="#16a34a22"
              title={t.smsMapEvcMainAccountTitle}
              valueLabel={displayAccount(smsSettings.evc.defaultAccountId)}
              hint={t.smsMapEvcMainAccountHint}
              isPlaceholder={!smsSettings.evc.defaultAccountId}
              onPress={() => setAccountPick({ kind: "provider", provider: "evc", field: "default" })}
            />
            <RowDivider theme={theme} />
            <AdvancedSimToggleRow
              theme={theme}
              label={t.smsMapAdvancedSimHeading}
              expanded={evcAdvancedExpanded}
              onToggle={() => setEvcAdvancedExpanded((v) => !v)}
              showLabel={t.smsMapAdvancedSimShow}
              hideLabel={t.smsMapAdvancedSimHide}
            />
            {evcAdvancedExpanded ? (
              <>
                <MappingRow
                  theme={theme}
                  icon={<CreditCard size={22} color="#8b5cf6" />}
                  iconBg="#8b5cf618"
                  title={t.smsImportSim1Label}
                  valueLabel={displayAccount(smsSettings.evc.sim1AccountId)}
                  hint={t.smsMapEvcSim1Hint}
                  isPlaceholder={!smsSettings.evc.sim1AccountId}
                  onPress={() => setAccountPick({ kind: "provider", provider: "evc", field: "sim1" })}
                />
                <RowDivider theme={theme} />
                <MappingRow
                  theme={theme}
                  icon={<CreditCard size={22} color="#8b5cf6" />}
                  iconBg="#8b5cf618"
                  title={t.smsImportSim2Label}
                  valueLabel={displayAccount(smsSettings.evc.sim2AccountId)}
                  hint={t.smsMapEvcSim2Hint}
                  isPlaceholder={!smsSettings.evc.sim2AccountId}
                  onPress={() => setAccountPick({ kind: "provider", provider: "evc", field: "sim2" })}
                />
              </>
            ) : null}
          </Card>

          <SectionLabel text={t.smsMapSectionSomnet} theme={theme} />
          <Card theme={theme}>
            <MappingRow
              theme={theme}
              icon={<Radio size={22} color={theme.primary} />}
              iconBg={theme.isDark ? theme.primary + "24" : theme.primary + "1A"}
              title={t.smsMapSomnetMainAccountTitle}
              valueLabel={displayAccount(smsSettings.somnet_jeeb.defaultAccountId)}
              hint={t.smsMapSomnetMainAccountHint}
              isPlaceholder={!smsSettings.somnet_jeeb.defaultAccountId}
              onPress={() =>
                setAccountPick({ kind: "provider", provider: "somnet_jeeb", field: "default" })
              }
            />
            <RowDivider theme={theme} />
            <AdvancedSimToggleRow
              theme={theme}
              label={t.smsMapAdvancedSimHeading}
              expanded={somnetAdvancedExpanded}
              onToggle={() => setSomnetAdvancedExpanded((v) => !v)}
              showLabel={t.smsMapAdvancedSimShow}
              hideLabel={t.smsMapAdvancedSimHide}
            />
            {somnetAdvancedExpanded ? (
              <>
                <MappingRow
                  theme={theme}
                  icon={<CreditCard size={22} color="#6366f1" />}
                  iconBg="#6366f118"
                  title={t.smsImportSim1Label}
                  valueLabel={displayAccount(smsSettings.somnet_jeeb.sim1AccountId)}
                  hint={t.smsMapSomnetSim1Hint}
                  isPlaceholder={!smsSettings.somnet_jeeb.sim1AccountId}
                  onPress={() =>
                    setAccountPick({ kind: "provider", provider: "somnet_jeeb", field: "sim1" })
                  }
                />
                <RowDivider theme={theme} />
                <MappingRow
                  theme={theme}
                  icon={<CreditCard size={22} color="#6366f1" />}
                  iconBg="#6366f118"
                  title={t.smsImportSim2Label}
                  valueLabel={displayAccount(smsSettings.somnet_jeeb.sim2AccountId)}
                  hint={t.smsMapSomnetSim2Hint}
                  isPlaceholder={!smsSettings.somnet_jeeb.sim2AccountId}
                  onPress={() =>
                    setAccountPick({ kind: "provider", provider: "somnet_jeeb", field: "sim2" })
                  }
                />
              </>
            ) : null}
          </Card>

          <SectionLabel text={t.smsMapSectionSalaam} theme={theme} />
          <Card theme={theme}>
            <MappingRow
              theme={theme}
              icon={<Landmark size={22} color="#0d9488" />}
              iconBg="#0d948818"
              title={t.smsMapSalaamAccountTitle}
              valueLabel={displayAccount(smsSettings.salaam_bank.defaultAccountId)}
              hint={t.smsMapSalaamAccountHint}
              isPlaceholder={!smsSettings.salaam_bank.defaultAccountId}
              onPress={() =>
                setAccountPick({ kind: "provider", provider: "salaam_bank", field: "default" })
              }
            />
          </Card>
        </ScrollView>
      )}

      <Modal
        visible={accountPick != null}
        animationType="slide"
        transparent
        onRequestClose={() => setAccountPick(null)}
      >
        <Pressable
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.45)",
          }}
          onPress={() => setAccountPick(null)}
        >
          <Pressable
            style={{
              maxHeight: "78%",
              backgroundColor: theme.cardBackground,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              overflow: "hidden",
              paddingTop: 10,
              paddingHorizontal: 20,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              borderTopWidth: 1,
              borderColor: theme.border,
              ...Platform.select({
                ios: {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: -4 },
                  shadowOpacity: 0.12,
                  shadowRadius: 12,
                },
                android: { elevation: 12 },
              }),
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.border,
                alignSelf: "center",
                marginBottom: 16,
              }}
            />
            <Text style={{ color: theme.text, fontSize: 19, fontWeight: "700", letterSpacing: -0.3 }}>
              {t.smsPickSelectAccount}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 8, lineHeight: 19 }}>
              {accountPick?.kind === "global_default"
                ? t.smsPickHintGlobalDefault
                : accountPick?.provider === "salaam_bank"
                  ? t.smsPickHintSalaam
                  : accountPick?.field === "sim1" || accountPick?.field === "sim2"
                    ? t.smsPickHintSim
                    : t.smsPickHintProviderFallback}
            </Text>

            <ScrollView
              style={{ marginTop: 18 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                onPress={async () => {
                  if (!accountPick) return;
                  await saveSmsAccountPick(accountPick, null);
                  setAccountPick(null);
                }}
                activeOpacity={0.7}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>
                  {t.smsImportNotSetShort}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                  {accountPick?.kind === "global_default"
                    ? t.smsPickNotSetGlobal
                    : accountPick?.field === "sim1" || accountPick?.field === "sim2"
                      ? t.smsPickNotSetSim
                      : t.smsPickNotSetProvider}
                </Text>
              </TouchableOpacity>

              {accounts.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  onPress={async () => {
                    if (!accountPick) return;
                    await saveSmsAccountPick(accountPick, a.id);
                    setAccountPick(null);
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: theme.primary + "18",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 15 }}>
                      {(a.name || "?").slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}
                      numberOfLines={1}
                    >
                      {a.name}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 3 }}>
                      {"Balance: $" + (a.amount ?? 0).toFixed(2)}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={theme.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
