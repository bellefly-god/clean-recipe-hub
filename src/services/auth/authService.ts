import { supabase } from "@/lib/supabase";

export function isAuthConfigured() {
  return supabase !== null;
}

export function getAuthClient() {
  return supabase;
}

export async function signOutUser() {
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}
