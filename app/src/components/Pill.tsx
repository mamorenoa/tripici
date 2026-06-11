import { Pressable, Text } from "react-native";

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

/**
 * Toggleable pill used for category filters and similar selectors.
 * Compact (paddingVertical: 6) so a horizontal row reads as a thin
 * filter strip, not a chunky button bar.
 */
export function Pill({ label, active, onPress, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-full ${
        active ? "bg-brand-600" : "bg-slate-100"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <Text
        className={`text-sm font-medium ${
          active ? "text-white" : "text-ink-secondary"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
