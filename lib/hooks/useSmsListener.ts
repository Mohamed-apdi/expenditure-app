import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { getCurrentUserOfflineFirst } from "../auth";
import { supabase } from "../database/supabase";
import {
  isEvcSmsNativeAvailable,
  getEvcSmsDebugState,
  subscribeEvcSms,
  subscribeSmsDebug,
  syncEvcSmsNativeListening,
  peekNativeEvcPendingRows,
  deleteNativeEvcPendingRowsByIds,
} from "../services/evcSmsBridge";
import {
  classifyEvcMessage,
  normalizeSender,
  passesContentFilter,
} from "../evc/evcMessageClassifier";
import { applyEvcSmsToLedger, applyNativeEvcRowToLedger } from "../evc/evcTransactionService";

async function flushNativeEvcPendingRows(): Promise<void> {
  const user = await getCurrentUserOfflineFirst();
  if (!user) {
    return;
  }

  const pending = peekNativeEvcPendingRows(50);
  if (pending.length === 0) return;

  console.log("[EVC SMS] pending rows", { count: pending.length });

  const idsToDelete: number[] = [];
  for (const row of pending) {
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;
    console.log("[EVC SMS] pending row", {
      id,
      kind: row.kind,
      slot: row.slot ?? null,
      subId: row.subId ?? null,
      createdAt: row.createdAt,
    });
    const result = await applyNativeEvcRowToLedger({
      sender: String(row.sender ?? ""),
      kind: String(row.kind ?? "ignored"),
      amount: row.amount ?? null,
      dateIso: row.dateIso ?? null,
      tarRaw: row.tarRaw ?? null,
      phone: row.phone ?? null,
      name: row.name ?? null,
      merchantName: row.merchantName ?? null,
      noticeSummary: row.noticeSummary ?? null,
      subId: row.subId ?? null,
      slot: row.slot ?? null,
    } as any);
    console.log("[EVC SMS] pending row result", { id, result });
    if (result === "applied" || result === "skipped_duplicate") {
      idsToDelete.push(id);
    }
  }
  deleteNativeEvcPendingRowsByIds(idsToDelete);
}

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

      try {
        await flushNativeEvcPendingRows();
      } catch (e) {
        console.warn("[EVC SMS] pending import failed", e);
      }

      subRef.current?.remove();
      debugSub?.remove();
      debugSub = subscribeSmsDebug((p) => {
        console.log("[EVC SMS] sms_debug", p);
      });
      const sub = subscribeEvcSms(async (payload) => {
        const { sender, body, subId, slot } = payload;
        console.log("[EVC SMS] inbound", { sender });
        const n = normalizeSender(sender);
        if (!passesContentFilter(n, body)) return;
        const kind = classifyEvcMessage(n, body);
        console.log("[EVC SMS] classified", { sender: n, kind });
        try {
          const okApply = await applyEvcSmsToLedger({ sender, body, kind, subId: subId ?? null, slot: slot ?? null });
          console.log("[EVC SMS] applied?", okApply);
        } catch (e) {
          console.warn("[EVC SMS] apply failed", e);
        }
      });
      subRef.current = sub ?? null;
      console.log("[EVC SMS] native debug", getEvcSmsDebugState());
    };

    void attach();

    // Cold start: native peek can run before React context is ready; auth can hydrate after first attach.
    const retryDelaysMs = [400, 1200, 3000];
    const retryTimers = retryDelaysMs.map((ms) =>
      setTimeout(() => {
        if (!mounted) return;
        void flushNativeEvcPendingRows().catch((e) =>
          console.warn("[EVC SMS] pending import retry failed", e),
        );
      }, ms),
    );

    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") void attach();
    });

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void flushNativeEvcPendingRows().catch((e) =>
          console.warn("[EVC SMS] pending import after auth failed", e),
        );
      }
    });

    return () => {
      mounted = false;
      retryTimers.forEach(clearTimeout);
      authSubscription.unsubscribe();
      appSub.remove();
      subRef.current?.remove();
      subRef.current = null;
      debugSub?.remove();
      debugSub = null;
    };
  }, []);
}
