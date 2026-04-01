import { GUEST_USAGE_KEY, MAX_GUEST_USES } from "@/lib/constants";
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
  if (isExtensionEnvironment()) {
    return (await getLocalStorageValue<number>(GUEST_USAGE_KEY)) ?? 0;
  }

  return readFallbackValue();
}

export async function incrementGuestUsage() {
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
  return Math.max(0, MAX_GUEST_USES - (await getGuestUsageCount()));
}

export async function hasGuestUsesRemaining() {
  return (await getGuestUsageCount()) < MAX_GUEST_USES;
}
