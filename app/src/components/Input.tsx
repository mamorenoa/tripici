import { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { Icon } from "./Icon";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
};

export function Input({
  label,
  error,
  helperText,
  className = "",
  onFocus,
  onBlur,
  editable,
  secureTextEntry,
  ...rest
}: Props) {
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
        <Text className="text-sm text-ink-secondary font-medium">{label}</Text>
      ) : null}
      <View className="relative justify-center">
        <TextInput
          {...rest}
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
          placeholderTextColor="#94a3b8"
          className={`border ${borderColor} rounded-2xl px-3.5 py-3 text-base text-ink-primary bg-surface ${
            isPassword ? "pr-11" : ""
          } ${editable === false ? "opacity-60" : ""}`}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              revealed ? "Hide password" : "Show password"
            }
            className="absolute right-3 p-1"
          >
            <Icon
              name={revealed ? "eye-off" : "eye"}
              size={20}
              color="#94a3b8"
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="text-xs text-danger-500">{error}</Text>
      ) : helperText ? (
        <Text className="text-xs text-ink-muted">{helperText}</Text>
      ) : null}
    </View>
  );
}
