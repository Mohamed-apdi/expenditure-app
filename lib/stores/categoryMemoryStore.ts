import { observable } from "@legendapp/state";

import { normalizePhone } from "../evc/phoneNormalize";
import { resolveCategoryIdFromStored } from "../utils/categories";
import { legendPersist } from "./legendPersist";

type MemoryEntry = {
  /** Expense category id (preferred) */
  categoryId?: string;
  /** Legacy: display name or id from older builds */
  category?: string;
  name?: string;
  /** User-edited note for this counterparty; applied to new EVC rows */
  note?: string;
  updated_at: string;
};

export type CategoryMemoryState = {
  /** userId → normalizedPhone → entry */
  entries: Record<string, Record<string, MemoryEntry>>;
};

const initialState: CategoryMemoryState = {
  entries: {},
};

export const categoryMemory$ = observable(initialState);

legendPersist(categoryMemory$, "evcCategoryMemory");

export function getMemoryCategoryByNormalizedPhone(
  userId: string,
  normalizedPhone: string,
): string | null {
  const row = categoryMemory$.get().entries[userId]?.[normalizedPhone];
  const id = resolveCategoryIdFromStored(row?.categoryId ?? row?.category);
  return id ?? null;
}

export function getMemoryNoteByNormalizedPhone(
  userId: string,
  normalizedPhone: string,
): string | null {
  const row = categoryMemory$.get().entries[userId]?.[normalizedPhone];
  const n = String(row?.note ?? "").trim();
  return n.length ? n : null;
}

/**
 * Merge category / name / note for a normalized phone key.
 * Omit a field to leave the previous value unchanged (except categoryId replaces legacy category).
 */
export function setCategoryMemoryForUser(
  userId: string,
  input: {
    phoneRaw: string;
    categoryId?: string;
    name?: string;
    /** When set (including ""), updates or clears stored note */
    note?: string;
  },
): void {
  const phone = normalizePhone(input.phoneRaw);
  if (!phone) return;
  if (
    input.categoryId === undefined &&
    input.name === undefined &&
    input.note === undefined
  ) {
    return;
  }

  const now = new Date().toISOString();
  categoryMemory$.set((state) => {
    const userMap = { ...(state.entries[userId] ?? {}) };
    const prev = userMap[phone];
    const next: MemoryEntry = {
      categoryId: prev?.categoryId,
      category: prev?.category,
      name: prev?.name,
      note: prev?.note,
      updated_at: now,
    };

    if (input.categoryId !== undefined) {
      next.categoryId = input.categoryId;
      delete next.category;
    }
    if (input.name !== undefined) {
      next.name = input.name;
    }
    if (input.note !== undefined) {
      const trimmed = input.note.trim();
      next.note = trimmed.length ? trimmed : undefined;
    }

    userMap[phone] = next;
    return {
      entries: {
        ...state.entries,
        [userId]: userMap,
      },
    };
  });
}
