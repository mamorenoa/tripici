import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { colors } from "../lib/theme";
import { Icon } from "./Icon";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
};

// Focus is shown by the teal border; suppress the browser's default focus
// ring on web (react-native-web maps `outlineStyle` to the DOM). Inline so
// it doesn't depend on global CSS being picked up by the bundler.
const webNoOutline =
  Platform.OS === "web"
    ? ({ outlineStyle: "none" } as unknown as TextInputProps["style"])
    : undefined;

export function Input({
  label,
  error,
  helperText,
  className = "",
  onFocus,
  onBlur,
  editable,
  secureTextEntry,
  style,
  ...rest
}: Props) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  // For password fields: start hidden, let the eye button reveal it.
  const [revealed, setRevealed] = useState(false);
  const isPassword = !!secureTextEntry;

  const borderColor = error
    ? "border-danger-500"
    : focused
      ? "border-brand-600"
      : "border-border";

  return (
    <View className={`gap-1.5 ${className}`}>
      {label ? (
        <Text className="text-xs text-ink-secondary font-semibold uppercase tracking-wide">
          {label}
        </Text>
      ) : null}
      <View className="relative justify-center">
        <TextInput
          {...rest}
          style={[webNoOutline, style]}
          editable={editable}
          secureTextEntry={isPassword && !revealed}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.ink.muted}
          className={`border ${borderColor} rounded-lg px-4 py-3 text-base text-ink-primary bg-surface ${
            isPassword ? "pr-11" : ""
          } ${editable === false ? "opacity-60" : ""}`}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              revealed ? t("common.hidePassword") : t("common.showPassword")
            }
            className="absolute right-3 p-1"
          >
            <Icon
              name={revealed ? "eye-off" : "eye"}
              size={20}
              color={colors.ink.muted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View className="flex-row items-center gap-1.5">
          <Icon name="alert-circle" size={14} color={colors.danger[500]} />
          <Text className="text-xs text-danger-500 flex-1">{error}</Text>
        </View>
      ) : helperText ? (
        <View className="flex-row items-center gap-1.5">
          <Icon name="info" size={14} color={colors.ink.muted} />
          <Text className="text-xs text-ink-muted flex-1">{helperText}</Text>
        </View>
      ) : null}
    </View>
  );
}
