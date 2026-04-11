import { setCategoryMemoryForUser } from "../stores/categoryMemoryStore";
import { resolveCategoryIdFromStored } from "../utils/categories";

/**
 * Persist phone → category id when user sets/changes category on an EVC-tagged row.
 * Call after local merge when `category` changed and `evc_counterparty_phone` is present.
 */
export function syncEvcCategoryMemoryFromRow(input: {
  userId: string;
  evcCounterpartyPhone: string | null | undefined;
  newCategoryStored: string | undefined | null;
}): void {
  const phone = input.evcCounterpartyPhone;
  if (phone == null || !String(phone).trim()) return;
  const raw = String(input.newCategoryStored ?? "").trim();
  if (!raw) return;
  const categoryId = resolveCategoryIdFromStored(raw) ?? raw;
  setCategoryMemoryForUser(input.userId, {
    phoneRaw: phone,
    categoryId,
  });
}
