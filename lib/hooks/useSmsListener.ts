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
  isSmsImportGloballyEnabled,
  isSmsProviderEnabled,
} from "../services/smsImportSettings";
import type { SmsProvider } from "../sms/providers/types";
import { parseSmsTransaction } from "../sms/providers/parseSmsTransaction";
import { applyNativeEvcRowToLedger, applySmsImportToLedger } from "../evc/evcTransactionService";
import type { NativeEvcPendingRow } from "../evc/evcTransactionService";

async function flushNativeEvcPendingRows(): Promise<void> {
  const user = await getCurrentUserOfflineFirst();
  if (!user) {
    return;
  }

  const pending = peekNativeEvcPendingRows(50);
  if (pending.length === 0) return;

  console.log("[SMS import] pending rows", { count: pending.length });

  const idsToDelete: number[] = [];
  for (const row of pending) {
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;
    const rowProv = (row.provider ?? "evc") as SmsProvider;
    if (!(await isSmsImportGloballyEnabled(user.id))) {
      idsToDelete.push(id);
      continue;
    }
    if (!(await isSmsProviderEnabled(user.id, rowProv))) {
      idsToDelete.push(id);
      continue;
    }
    console.log("[SMS import] pending row", {
      id,
      provider: row.provider,
      kind: row.kind,
      slot: row.slot ?? null,
      subId: row.subId ?? null,
      createdAt: row.createdAt,
    });
    const nativeRow: NativeEvcPendingRow = {
      provider: row.provider ?? undefined,
      sender: String(row.sender ?? ""),
      kind: String(row.kind ?? "ignored") as NativeEvcPendingRow["kind"],
      amount: row.amount ?? null,
      dateIso: row.dateIso ?? null,
      tarRaw: row.tarRaw ?? null,
      phone: row.phone ?? null,
      name: row.name ?? null,
      merchantName: row.merchantName ?? null,
      noticeSummary: row.noticeSummary ?? null,
      subId: row.subId ?? null,
      slot: row.slot ?? null,
      rawType: row.rawType ?? null,
      reference: row.reference ?? null,
      transactionId: row.transactionId ?? null,
      accountNumber: row.accountNumber ?? null,
      balance: row.balance ?? null,
      currency: row.currency ?? null,
      note: row.note ?? null,
      capturedNotificationShown: row.capturedNotificationShown ?? null,
    };
    const result = await applyNativeEvcRowToLedger(nativeRow);
    console.log("[SMS import] pending row result", { id, result });
    if (result === "applied" || result === "skipped_duplicate") {
      idsToDelete.push(id);
    }
  }
  deleteNativeEvcPendingRowsByIds(idsToDelete);
}

/**
 * Subscribes to SMS auto-import events when enabled (Android dev/production builds only).
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
        console.warn("[SMS import] pending import failed", e);
      }

      subRef.current?.remove();
      debugSub?.remove();
      debugSub = subscribeSmsDebug((p) => {
        console.log("[SMS import] sms_debug", p);
      });
      const sub = subscribeEvcSms(async (payload) => {
        const { sender, body, subId, slot } = payload;
        console.log("[SMS import] inbound", { sender });
        const parsed = parseSmsTransaction(sender, body);
        if (!parsed || parsed.kind === "ignored") return;
        const user = await getCurrentUserOfflineFirst();
        if (!user) return;
        const provOk = await isSmsProviderEnabled(user.id, parsed.provider);
        if (!provOk) return;
        try {
          const okApply = await applySmsImportToLedger({
            parsed,
            sender,
            slot: slot ?? null,
          });
          console.log("[SMS import] applied?", okApply);
        } catch (e) {
          console.warn("[SMS import] apply failed", e);
        }
      });
      subRef.current = sub ?? null;
      console.log("[SMS import] native debug", getEvcSmsDebugState());
    };

    void attach();

    const retryDelaysMs = [400, 1200, 3000];
    const retryTimers = retryDelaysMs.map((ms) =>
      setTimeout(() => {
        if (!mounted) return;
        void flushNativeEvcPendingRows().catch((e) =>
          console.warn("[SMS import] pending import retry failed", e),
        );
      }, ms),
    );

    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") void attach();
    });

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Initial attach() can run before Supabase session hydrates, which pushes
      // providerEvc=false to native. Re-sync prefs whenever auth changes so EVC
      // matches JS settings after login (Salaam could look fine if only DB queue flushed).
      void syncEvcSmsNativeListening()
        .then(() => {
          if (session?.user) {
            return flushNativeEvcPendingRows();
          }
        })
        .catch((e) =>
          console.warn("[SMS import] sync after auth change failed", e),
        );
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
