import { Pressable, Text } from "react-native";

import { SUPPORTED_LANGUAGES } from "../lib/i18n";
import { useLanguage } from "../domain/settings/useLanguage";
import { colors } from "../lib/theme";
import { Icon } from "./Icon";

/**
 * Compact language toggle for a header. Shows a globe + the active
 * language code and cycles to the next supported language on press.
 * With two languages this is a simple EN ⇄ ES toggle.
 */
export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const next =
    SUPPORTED_LANGUAGES[
      (SUPPORTED_LANGUAGES.indexOf(language) + 1) % SUPPORTED_LANGUAGES.length
    ];

  return (
    <Pressable
      onPress={() => setLanguage(next)}
      accessibilityRole="button"
      accessibilityLabel={`Language: ${language.toUpperCase()}`}
      className="px-3 py-2 flex-row items-center gap-1.5"
    >
      <Icon name="globe" size={18} color={colors.brand[600]} />
      <Text className="text-brand-600 font-semibold text-sm">
        {language.toUpperCase()}
      </Text>
    </Pressable>
  );
}
