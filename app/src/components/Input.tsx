import { useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

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
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
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
      <TextInput
        {...rest}
        editable={editable}
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
          editable === false ? "opacity-60" : ""
        }`}
      />
      {error ? (
        <Text className="text-xs text-danger-500">{error}</Text>
      ) : helperText ? (
        <Text className="text-xs text-ink-muted">{helperText}</Text>
      ) : null}
    </View>
  );
}
