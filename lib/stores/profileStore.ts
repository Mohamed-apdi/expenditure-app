import { observable } from "@legendapp/state";
import { v4 as uuidv4 } from "uuid";

import type { Profile } from "../types/types";
import { legendPersist } from "./legendPersist";
import {
  LocalProfile,
  ensureId,
  markPending,
  nowIso,
  safeMerge,
  softDelete,
} from "./storeUtils";

export interface ProfilesState {
  byId: Record<string, LocalProfile>;
  allIds: string[];
}

const initialState: ProfilesState = {
  byId: {},
  allIds: [],
};

export const profiles$ = observable<ProfilesState>(initialState);

legendPersist(profiles$, "profiles");

export function selectProfile(userId: string): LocalProfile | undefined {
  const state = profiles$.get();
  const row = state.byId[userId];
  if (!row || row.deleted_at != null) return undefined;
  return row;
}

export function createProfileLocal(
  userId: string,
  data: Omit<Profile, "id" | "created_at"> & { id?: string }
): LocalProfile {
  const now = nowIso();
  const id = data.id ?? userId ?? uuidv4();

  const base: LocalProfile = {
    id,
    full_name: data.full_name,
    phone: data.phone,
    user_type: data.user_type,
    created_at: now,
    image_url: data.image_url,
    email: data.email,
    deleted_at: null,
    __local_status: "pending",
    __local_updated_at: now,
    __last_error: null,
    __remote_updated_at: null,
  };

  const row = markPending(base);

  profiles$.set((state) => {
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = ensureId(state.allIds, id);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return row;
}

export function updateProfileLocal(
  userId: string,
  patch: Partial<Omit<Profile, "id" | "created_at">>
): LocalProfile | undefined {
  let updated: LocalProfile | undefined;

  profiles$.set((state) => {
    const existing = state.byId[userId];
    if (!existing) return state;

    const now = nowIso();
    const merged = safeMerge<LocalProfile>(existing, {
      ...patch,
    } as Partial<LocalProfile>);

    const row = markPending(merged);
    updated = row;

    const nextById = { ...state.byId, [userId]: row };
    return { ...state, byId: nextById, allIds: state.allIds };
  });

  return updated;
}

export function deleteProfileLocal(userId: string): void {
  profiles$.set((state) => {
    const existing = state.byId[userId];
    if (!existing) return state;

    const row = softDelete(existing);
    const nextById = { ...state.byId, [userId]: row };
    return { ...state, byId: nextById, allIds: state.allIds };
  });
}

