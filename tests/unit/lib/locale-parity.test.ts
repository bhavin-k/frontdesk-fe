import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createI18nInstance, englishResources } from "@/i18n";
import { SUPPORTED_LOCALES, formatDateTime } from "@/lib/locale";

function leaves(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`Invalid message at ${prefix}`);
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  );
}
describe("English dashboard resources", () => {
  it("registers every English namespace and resolves its leaf keys", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en"]);
    const path = resolve(import.meta.dirname, "../../../public/locales/en");
    expect(
      readdirSync(path)
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.slice(0, -5))
        .sort(),
    ).toEqual(Object.keys(englishResources).sort());
    const i18n = createI18nInstance();
    for (const [namespace, resources] of Object.entries(englishResources)) {
      expect(resources).toEqual(
        JSON.parse(readFileSync(resolve(path, `${namespace}.json`), "utf8")),
      );
      for (const key of leaves(resources))
        expect(i18n.exists(`${namespace}:${key}`), `${namespace}:${key}`).toBe(
          true,
        );
    }
    expect(i18n.t("dashboard:table.page", { page: 2 })).toBe("Page 2");
  });
  it("keeps tenant-facing times in IST across a UTC date boundary", () => {
    expect(formatDateTime("2026-11-03T20:00:00Z", "24h")).toContain(
      "4 Nov 2026",
    );
    expect(formatDateTime("2026-11-03T20:00:00Z", "24h")).toContain("01:30");
  });
});
