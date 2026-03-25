import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import {
  isEvcSmsNativeAvailable,
  getEvcSmsDebugState,
  subscribeEvcSms,
  subscribeSmsDebug,
  syncEvcSmsNativeListening,
} from "../services/evcSmsBridge";
import {
  classifyEvcMessage,
  normalizeSender,
  passesContentFilter,
} from "../evc/evcMessageClassifier";
import { applyEvcSmsToLedger, applyNativeEvcRowToLedger } from "../evc/evcTransactionService";
import { requireOptionalNativeModule } from "expo-modules-core";

/**
 * Subscribes to EVC SMS events when the feature is enabled (Android dev/production builds only).
 * Re-syncs native listening when the app returns to foreground (e.g. after changing Settings).
 */
export function useSmsListener(): void {
  const subRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (!isEvcSmsNativeAvailable()) return;

    let mounted = true;
    let debugSub: { remove: () => void } | null = null;

    const attach = async () => {
      await syncEvcSmsNativeListening();
      if (!mounted) return;

      // Import any native-captured EVC rows (received while JS wasn't running).
      try {
        const mod = requireOptionalNativeModule<any>("ExpoEvcSms");
        const pending = mod?.fetchAndClearPending?.(50) ?? [];
        if (Array.isArray(pending) && pending.length > 0) {
          for (const row of pending) {
            await applyNativeEvcRowToLedger({
              sender: String(row.sender ?? ""),
              kind: String(row.kind ?? "ignored"),
              amount: row.amount ?? null,
              dateIso: row.dateIso ?? null,
              tarRaw: row.tarRaw ?? null,
              phone: row.phone ?? null,
              name: row.name ?? null,
              merchantName: row.merchantName ?? null,
              noticeSummary: row.noticeSummary ?? null,
            } as any);
          }
        }
      } catch (e) {
        console.warn("[EVC SMS] pending import failed", e);
      }

      subRef.current?.remove();
      debugSub?.remove();
      debugSub = subscribeSmsDebug((p) => {
        // Privacy-safe: no SMS body printed.
        console.log("[EVC SMS] sms_debug", p);
      });
      const sub = subscribeEvcSms(async (payload) => {
        const { sender, body } = payload;
        // Minimal runtime signal for debugging; does not persist SMS.
        console.log("[EVC SMS] inbound", { sender });
        const n = normalizeSender(sender);
        if (!passesContentFilter(n, body)) return;
        const kind = classifyEvcMessage(n, body);
        console.log("[EVC SMS] classified", { sender: n, kind });
        try {
          const okApply = await applyEvcSmsToLedger({ sender, body, kind });
          console.log("[EVC SMS] applied?", okApply);
        } catch (e) {
          console.warn("[EVC SMS] apply failed", e);
        }
      });
      subRef.current = sub ?? null;
      console.log("[EVC SMS] native debug", getEvcSmsDebugState());
    };

    void attach();

    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") void attach();
    });

    return () => {
      mounted = false;
      appSub.remove();
      subRef.current?.remove();
      subRef.current = null;
      debugSub?.remove();
      debugSub = null;
    };
  }, []);
}
