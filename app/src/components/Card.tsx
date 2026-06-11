import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

type Props = ViewProps & {
  className?: string;
  children?: ReactNode;
};

/**
 * Surface primitive: white background, rounded, subtle shadow.
 * Default padding is generous; pass `p-0` / `p-2` etc. via className
 * to override.
 */
export function Card({ className = "", children, ...rest }: Props) {
  return (
    <View
      {...rest}
      className={`bg-surface rounded-2xl shadow-card p-4 ${className}`}
    >
      {children}
    </View>
  );
}
