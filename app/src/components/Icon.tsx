import { Feather } from "@expo/vector-icons";

import { colors } from "../lib/theme";

// Names we use anywhere in the app. Constraining the type means
// IntelliSense surfaces only valid icons and a typo at the call site
// is caught at type-check rather than at render time.
export type IconName =
  | "chevron-left"
  | "chevron-right"
  | "plus"
  | "users"
  | "share-2"
  | "copy"
  | "trash-2"
  | "log-out"
  | "edit-2"
  | "x"
  | "check"
  | "compass"
  | "calendar"
  | "mail"
  | "bar-chart-2"
  | "eye"
  | "eye-off"
  | "divide"
  | "map-pin"
  | "globe"
  | "credit-card"
  | "alert-circle"
  | "info"
  | "list";

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
};

export function Icon({
  name,
  size = 20,
  color = colors.ink.primary,
  className,
}: Props) {
  return <Feather name={name} size={size} color={color} className={className} />;
}
