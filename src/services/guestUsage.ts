import { MAX_GUEST_USES, GUEST_USAGE_KEY } from "@/lib/constants";

export function getGuestUsageCount(): number {
  const stored = localStorage.getItem(GUEST_USAGE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

export function incrementGuestUsage(): number {
  const current = getGuestUsageCount();
  const next = current + 1;
  localStorage.setItem(GUEST_USAGE_KEY, String(next));
  return next;
}

export function getRemainingGuestUses(): number {
  return Math.max(0, MAX_GUEST_USES - getGuestUsageCount());
}

export function hasGuestUsesRemaining(): boolean {
  return getGuestUsageCount() < MAX_GUEST_USES;
}
