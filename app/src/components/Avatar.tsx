import { Text, View } from "react-native";

type Props = {
  name: string;
  size?: number;
  className?: string;
};

// Small palette derived from the brand colours. The user's id (or
// display name) picks the slot — same user always gets the same
// colour so the avatar is recognisable across screens.
const PALETTE = [
  { bg: "#d1fae5", fg: "#047857" },
  { bg: "#dbeafe", fg: "#1d4ed8" },
  { bg: "#fef3c7", fg: "#b45309" },
  { bg: "#fce7f3", fg: "#be185d" },
  { bg: "#ede9fe", fg: "#5b21b6" },
  { bg: "#e0f2fe", fg: "#075985" },
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, size = 40, className = "" }: Props) {
  const slot = PALETTE[hash(name) % PALETTE.length];
  return (
    <View
      className={`items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size, backgroundColor: slot.bg }}
    >
      <Text
        className="font-semibold"
        style={{ color: slot.fg, fontSize: size * 0.4 }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}
