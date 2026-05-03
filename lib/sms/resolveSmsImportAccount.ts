import { selectAccounts } from "~/lib/stores/accountsStore";
import type { SmsProvider } from "~/lib/sms/providers/types";
import { getSmsImportSettings } from "~/lib/services/smsImportSettings";

function slotIndexToSim(slot: number | null | undefined): "sim1" | "sim2" | null {
  if (slot === 0) return "sim1";
  if (slot === 1) return "sim2";
  return null;
}

function getDefaultAccountForUser(userId: string) {
  const accounts = selectAccounts(userId);
  const d = accounts.find((a) => a.is_default);
  return d ?? accounts[0];
}

/**
 * Target account for an SMS import row (SIM providers vs Salaam).
 */
export async function resolveSmsImportTargetAccount(input: {
  userId: string;
  provider: SmsProvider;
  slot?: number | null;
}): Promise<{ id: string; amount: number } | null> {
  const { userId, provider, slot } = input;
  const s = await getSmsImportSettings(userId);
  const prov = s[provider];

  if (provider === "salaam_bank") {
    if (prov.defaultAccountId) {
      const a = selectAccounts(userId).find((x) => x.id === prov.defaultAccountId);
      if (a) return a;
    }
    if (s.globalDefaultAccountId) {
      const a = selectAccounts(userId).find((x) => x.id === s.globalDefaultAccountId);
      if (a) return a;
    }
    return getDefaultAccountForUser(userId) ?? null;
  }

  const sim = slotIndexToSim(slot ?? null);
  if (sim) {
    const simKey = sim === "sim1" ? prov.sim1AccountId : prov.sim2AccountId;
    if (simKey) {
      const a = selectAccounts(userId).find((x) => x.id === simKey);
      if (a) return a;
    }
  }
  if (prov.defaultAccountId) {
    const a = selectAccounts(userId).find((x) => x.id === prov.defaultAccountId);
    if (a) return a;
  }
  if (s.globalDefaultAccountId) {
    const a = selectAccounts(userId).find((x) => x.id === s.globalDefaultAccountId);
    if (a) return a;
  }
  return getDefaultAccountForUser(userId) ?? null;
}
