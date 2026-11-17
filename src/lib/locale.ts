export const SUPPORTED_LOCALES = ["en"] as const;
export type SupportedLocale = "en";
export type TimeFormatPreference = "24h" | "ampm";
export const DEFAULT_LOCALE = "en";
const TIME_FORMAT_STORAGE_KEY = "recruitment-bt.time-format";

export function resolveLocale(
  ..._values: (string | null | undefined)[]
): SupportedLocale {
  return "en";
}
export function intlLocale(_value?: string): string {
  return "en-IN";
}
export function localeTag(_value?: SupportedLocale): string {
  return "en-IN";
}
export function readStoredTimeFormatPreference(): TimeFormatPreference | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(TIME_FORMAT_STORAGE_KEY);
    return value === "24h" || value === "ampm" ? value : null;
  } catch {
    return null;
  }
}
export function resolveTimeFormatPreference({
  storedPreference,
}: {
  storedPreference?: TimeFormatPreference | null;
  locale?: string;
}): TimeFormatPreference {
  return storedPreference ?? "ampm";
}
export function writeStoredTimeFormatPreference(value: TimeFormatPreference) {
  try {
    localStorage.setItem(TIME_FORMAT_STORAGE_KEY, value);
  } catch {
    /* Storage is optional. */
  }
}
export function formatDateTime(
  value: string | Date,
  preference: TimeFormatPreference = "ampm",
) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
    hour12: preference === "ampm",
  }).format(new Date(value));
}
