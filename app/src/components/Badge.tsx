import type { ReactNode } from "react";
import { Text, View } from "react-native";

type Variant = "brand" | "neutral" | "muted";

const variantBox: Record<Variant, string> = {
  brand: "bg-brand-50",
  neutral: "bg-slate-100",
  muted: "bg-background",
};

const variantText: Record<Variant, string> = {
  brand: "text-brand-700",
  neutral: "text-ink-secondary",
  muted: "text-ink-secondary",
};

type Props = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

export function Badge({ variant = "brand", className = "", children }: Props) {
  return (
    <View
      className={`px-2 py-0.5 rounded-full ${variantBox[variant]} ${className}`}
    >
      <Text className={`text-xs font-semibold ${variantText[variant]}`}>
        {children}
      </Text>
    </View>
  );
}
