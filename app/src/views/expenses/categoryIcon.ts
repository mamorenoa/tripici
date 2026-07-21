import type { IconName } from "../../components/Icon";

/**
 * Maps an expense category `code` to a Feather glyph shown in the expense
 * list tiles (redesign R3). Falls back to a neutral tag for unknown codes.
 */
const CATEGORY_ICONS: Record<string, IconName> = {
  RESTAURANTS: "coffee",
  ACCOMMODATION: "home",
  TRANSPORT: "truck",
  FUEL: "droplet",
  GROCERIES: "shopping-cart",
  ACTIVITIES: "activity",
  OTHER: "tag",
};

export function categoryIcon(code: string): IconName {
  return CATEGORY_ICONS[code] ?? "tag";
}
