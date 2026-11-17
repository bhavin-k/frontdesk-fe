import messages from "../../public/locales/en/auth.json";
import recruitment from "../../public/locales/en/recruitment.json";

export const authCopy = messages;
export const recruitmentCopy = recruitment;

export function statusLabel(value: string) {
  return (
    recruitment.status[value as keyof typeof recruitment.status] ??
    value.replaceAll("_", " ")
  );
}
