import { GUEST_USAGE_KEY, GUEST_USAGE_LIMIT_DISABLED, MAX_GUEST_USES } from "@/lib/constants";
import { getLocalStorageValue, isExtensionEnvironment, setLocalStorageValue } from "@/shared/utils/chrome";

function readFallbackValue() {
  if (typeof localStorage === "undefined") {
    return 0;
  }

  const stored = localStorage.getItem(GUEST_USAGE_KEY);
  return stored ? Number.parseInt(stored, 10) || 0 : 0;
}

function writeFallbackValue(value: number) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(GUEST_USAGE_KEY, String(value));
}

export async function getGuestUsageCount() {
  if (GUEST_USAGE_LIMIT_DISABLED) {
    return 0;
  }

  if (isExtensionEnvironment()) {
    return (await getLocalStorageValue<number>(GUEST_USAGE_KEY)) ?? 0;
  }

  return readFallbackValue();
}

export async function incrementGuestUsage() {
  if (GUEST_USAGE_LIMIT_DISABLED) {
    return 0;
  }

  const current = await getGuestUsageCount();
  const next = current + 1;

  if (isExtensionEnvironment()) {
    await setLocalStorageValue(GUEST_USAGE_KEY, next);
  } else {
    writeFallbackValue(next);
  }

  return next;
}

export async function getRemainingGuestUses() {
  if (GUEST_USAGE_LIMIT_DISABLED) {
    return MAX_GUEST_USES;
  }

  return Math.max(0, MAX_GUEST_USES - (await getGuestUsageCount()));
}

export async function hasGuestUsesRemaining() {
  if (GUEST_USAGE_LIMIT_DISABLED) {
    return true;
  }

  return (await getGuestUsageCount()) < MAX_GUEST_USES;
}
