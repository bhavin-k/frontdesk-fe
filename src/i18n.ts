import i18next, { type i18n as I18nextInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import common from "../public/locales/en/common.json";
import dashboard from "../public/locales/en/dashboard.json";
import auth from "../public/locales/en/auth.json";
import recruitment from "../public/locales/en/recruitment.json";
import intake from "../public/locales/en/intake.json";
import { type SupportedLocale } from "@/lib/locale";

export const englishResources = {
  common,
  dashboard,
  auth,
  recruitment,
  intake,
};
export function createI18nInstance(
  input: {
    locale?: SupportedLocale;
    appName?: string;
    resources?: Record<string, Record<string, unknown>>;
  } = {},
): I18nextInstance {
  const instance = i18next.createInstance();
  instance.use(initReactI18next);
  void instance.init({
    lng: "en",
    supportedLngs: ["en"],
    fallbackLng: "en",
    defaultNS: "common",
    ns: Object.keys(englishResources),
    resources: { en: { ...englishResources, ...input.resources } },
    initAsync: false,
    interpolation: {
      escapeValue: false,
      defaultVariables: { appName: input.appName ?? "Frontdesk" },
    },
    react: { useSuspense: false },
    returnNull: false,
  });
  return instance;
}
let fallback: I18nextInstance | undefined;
export function getFallbackI18n() {
  return (fallback ??= createI18nInstance());
}
