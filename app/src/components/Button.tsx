import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from "react-native";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

type Props = Omit<PressableProps, "children"> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  className?: string;
  children?: ReactNode;
};

const variantBox: Record<Variant, string> = {
  primary: "bg-brand-600 active:bg-brand-700",
  secondary: "bg-surface border border-border active:bg-background",
  danger: "bg-surface border border-danger-500 active:bg-danger-50",
  ghost: "bg-transparent active:bg-background",
};

const variantText: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-ink-primary",
  danger: "text-danger-500",
  ghost: "text-brand-600",
};

const sizeBox: Record<Size, string> = {
  sm: "px-3 py-2",
  md: "px-4 py-3",
  lg: "px-5 py-4",
};

const sizeText: Record<Size, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-base",
};

const SPINNER_COLOR: Record<Variant, string> = {
  primary: "#ffffff",
  secondary: "#0f172a",
  danger: "#e11d48",
  ghost: "#059669",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading,
  disabled,
  className = "",
  children,
  ...rest
}: Props) {
  const dimmed = disabled || isLoading ? "opacity-50" : "";
  return (
    <Pressable
      disabled={disabled || isLoading}
      {...rest}
      className={`flex-row items-center justify-center rounded-2xl ${variantBox[variant]} ${sizeBox[size]} ${dimmed} ${className}`}
    >
      {isLoading ? (
        <ActivityIndicator color={SPINNER_COLOR[variant]} />
      ) : typeof children === "string" ? (
        <Text className={`font-semibold ${variantText[variant]} ${sizeText[size]}`}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
