import { getCurrentUserOfflineFirst } from "../auth";
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
}): Promise<boolean> {
  const { userId, transactionId, categoryId, counterpartyName } = input;
  const tx = selectTransactionById(userId, transactionId);
  if (!tx) return false;
  if (tx.evc_kind !== "transfer") return false;
  if (!tx.evc_counterparty_phone) return false;

  updateTransactionLocal(transactionId, {
    category: categoryId,
  });

  const expenseId = tx.source_expense_id;
  if (expenseId) {
    const ex = selectExpenseById(userId, expenseId);
    if (ex) {
      updateExpenseLocal(expenseId, { category: categoryId });
    }
  }

  if (counterpartyName != null && String(counterpartyName).trim()) {
    setCategoryMemoryForUser(userId, {
      phoneRaw: tx.evc_counterparty_phone,
      categoryId,
      name: counterpartyName,
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
): Promise<boolean> {
  const user = await getCurrentUserOfflineFirst();
  if (!user) return false;
  return applyUserEvcCategory({
    userId: user.id,
    transactionId,
    categoryId,
    counterpartyName,
  });
}
