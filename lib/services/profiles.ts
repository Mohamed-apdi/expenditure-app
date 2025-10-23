import { supabase } from "../database/supabase";
import type { Profile } from "../types/types";

export const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching profile:", error);
    throw error;
  }

  return data;
};

export const createProfile = async (
  profile: Omit<Profile, "created_at">
): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .insert(profile)
    .select()
    .single();

  if (error) {
    console.error("Error creating profile:", error);
    throw error;
  }

  return data;
};

export const updateProfile = async (
  userId: string,
  updates: Partial<Omit<Profile, "id" | "created_at">>
): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    throw error;
  }

  return data;
};

export const updateProfileImage = async (
  userId: string,
  imageUrl: string
): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .update({ image_url: imageUrl })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile image:", error);
    throw error;
  }

  return data;
};

export const updateProfileEmail = async (
  userId: string,
  email: string
): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .update({ email })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile email:", error);
    throw error;
  }

  return data;
};

export const updateProfilePhone = async (
  userId: string,
  phone: string
): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .update({ phone })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile phone:", error);
    throw error;
  }

  return data;
};

export const updateProfileName = async (
  userId: string,
  fullName: string
): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile name:", error);
    throw error;
  }

  return data;
};

export const updateUserType = async (
  userId: string,
  userType: string
): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .update({ user_type: userType })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user type:", error);
    throw error;
  }

  return data;
};
