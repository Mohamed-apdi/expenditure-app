import { getCurrentUserOfflineFirst } from "../auth";
import { markEvcNoteUserEdited } from "./evcNoteUserEdited";
import { updateExpenseLocal, selectExpenseById } from "../stores/expensesStore";
import {
  selectTransactionById,
  updateTransactionLocal,
} from "../stores/transactionsStore";
import { isOfflineGateLocked, triggerSync } from "../sync/legendSync";
import { setCategoryMemoryForUser } from "../stores/categoryMemoryStore";

/**
 * Apply a user-selected category to an EVC P2P transfer row (+ paired expense) and persist phone→category id memory.
 */
export async function applyUserEvcCategory(input: {
  userId: string;
  transactionId: string;
  categoryId: string;
  counterpartyName?: string;
  /** Optional note for this transaction and counterparty memory */
  userNote?: string;
}): Promise<boolean> {
  const { userId, transactionId, categoryId, counterpartyName, userNote } =
    input;
  const tx = selectTransactionById(userId, transactionId);
  if (!tx) return false;
  if (tx.evc_kind !== "transfer") return false;
  if (!tx.evc_counterparty_phone) return false;

  const noteTrim = (userNote ?? "").trim();
  const expenseId = tx.source_expense_id;

  updateTransactionLocal(transactionId, {
    category: categoryId,
    ...(noteTrim
      ? {
          description: (
            (tx.description ?? "").trim()
              ? `${(tx.description ?? "").trim()} · ${noteTrim}`
              : noteTrim
          ).slice(0, 500),
        }
      : {}),
  });

  if (expenseId) {
    const ex = selectExpenseById(userId, expenseId);
    if (ex) {
      updateExpenseLocal(expenseId, {
        category: categoryId,
        ...(noteTrim
          ? {
              description: (
                (ex.description ?? "").trim()
                  ? `${(ex.description ?? "").trim()} · ${noteTrim}`
                  : noteTrim
              ).slice(0, 500),
            }
          : {}),
      });
    }
  }

  if (noteTrim) {
    await markEvcNoteUserEdited(transactionId);
    if (expenseId) await markEvcNoteUserEdited(expenseId);
    setCategoryMemoryForUser(userId, {
      phoneRaw: tx.evc_counterparty_phone,
      categoryId,
      note: noteTrim,
      ...(counterpartyName != null && String(counterpartyName).trim()
        ? { name: String(counterpartyName).trim() }
        : {}),
    });
  } else if (counterpartyName != null && String(counterpartyName).trim()) {
    setCategoryMemoryForUser(userId, {
      phoneRaw: tx.evc_counterparty_phone,
      categoryId,
      name: String(counterpartyName).trim(),
    });
  }

  if (!(await isOfflineGateLocked())) void triggerSync();
  return true;
}

/**
 * Convenience: resolve current user from session.
 */
export async function applyUserEvcCategoryForCurrentUser(
  transactionId: string,
  categoryId: string,
  counterpartyName?: string,
  userNote?: string,
): Promise<boolean> {
  const user = await getCurrentUserOfflineFirst();
  if (!user) return false;
  return applyUserEvcCategory({
    userId: user.id,
    transactionId,
    categoryId,
    counterpartyName,
    userNote,
  });
}
