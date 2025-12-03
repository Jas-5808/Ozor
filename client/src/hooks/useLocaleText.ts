import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useLocaleText() {
  const { i18n } = useTranslation();
  return useCallback(
    (ru: string, uz: string) => (i18n.language?.split("-")[0] === "uz" ? uz : ru),
    [i18n.language]
  );
}



