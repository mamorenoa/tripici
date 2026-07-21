import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Icon } from "../../components/Icon";
import { useLanguage } from "../../domain/settings/useLanguage";
import { SUPPORTED_LANGUAGES } from "../../lib/i18n";
import { colors } from "../../lib/theme";

/** Inline EN | ES toggle for the auth screens' top-right corner. */
function AuthLanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return (
    <View className="flex-row items-center gap-2">
      {SUPPORTED_LANGUAGES.map((lng, i) => (
        <Fragment key={lng}>
          {i > 0 ? <Text className="text-ink-muted text-xs">|</Text> : null}
          <Pressable
            onPress={() => setLanguage(lng)}
            accessibilityRole="button"
            accessibilityLabel={lng.toUpperCase()}
            hitSlop={6}
          >
            <Text
              className={`text-xs font-semibold uppercase tracking-wide ${
                language === lng ? "text-ink-primary" : "text-ink-muted"
              }`}
            >
              {lng}
            </Text>
          </Pressable>
        </Fragment>
      ))}
    </View>
  );
}

/**
 * Shared shell for the auth screens (R1 redesign): a full-bleed branded
 * layout — language toggle top-right, brand mark + wordmark + tagline —
 * with the content centered in a max-width column so it reads as a card on
 * desktop rather than stretching. The native header is hidden by the auth
 * layout, so this owns the whole screen.
 */
export function AuthShell({
  tagline,
  children,
}: {
  tagline: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-5 py-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-sm self-center gap-8">
          <View className="flex-row justify-end">
            <AuthLanguageToggle />
          </View>

          <View className="items-center gap-4">
            <View className="w-16 h-16 rounded-2xl bg-brand-600 items-center justify-center shadow-card">
              <Icon name="credit-card" size={30} color={colors.white} />
            </View>
            <View className="items-center gap-1">
              <Text className="text-2xl font-bold text-brand-600 tracking-tight">
                {t("nav.appName")}
              </Text>
              <Text className="text-sm text-ink-secondary text-center">
                {tagline}
              </Text>
            </View>
          </View>

          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
