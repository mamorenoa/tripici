import { useTranslation } from "react-i18next";
import {
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Icon, type IconName } from "../../components/Icon";
import { useCoverImage } from "../../domain/cover/useCoverImage";
import type { Trip } from "../../domain/trips/types";
import { activeLocaleTag } from "../../lib/i18n";
import { formatEuros } from "../../lib/money";

// Deep, saturated backgrounds that read well under white text — used
// when there's no photo (or while it loads). Picked deterministically
// from the trip name so a given trip always gets the same colour.
const FALLBACK_COLORS = [
  "#0f766e", "#1d4ed8", "#7c3aed", "#be123c",
  "#b45309", "#0e7490", "#4d7c0f", "#c2410c",
];

function fallbackColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

/** Parse a "YYYY-MM-DD" as local noon to dodge timezone off-by-one. */
function atLocalNoon(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function openUrl(url: string) {
  if (Platform.OS === "web") {
    globalThis.window?.open(url, "_blank", "noopener,noreferrer");
  } else {
    Linking.openURL(url).catch(() => {});
  }
}

function Fact({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5 bg-surface rounded-full px-3 py-1.5 shadow-card">
      <Icon name={icon} size={15} color="#059669" />
      <Text className="text-sm font-medium text-ink-primary">{label}</Text>
    </View>
  );
}

type Props = {
  trip: Trip;
  totalCents: number;
  planCount: number;
  memberCount: number;
};

export function TripCover({ trip, totalCents, planCount, memberCount }: Props) {
  const { t } = useTranslation();
  const { data: cover } = useCoverImage(trip.name);
  const tag = activeLocaleTag();

  const dateOpts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const start = trip.start_date ? atLocalNoon(trip.start_date) : null;
  const end = trip.end_date ? atLocalNoon(trip.end_date) : null;
  const dateRange =
    start && end
      ? `${start.toLocaleDateString(tag, dateOpts)} – ${end.toLocaleDateString(tag, dateOpts)}`
      : start
        ? start.toLocaleDateString(tag, dateOpts)
        : end
          ? end.toLocaleDateString(tag, dateOpts)
          : null;
  const days =
    start && end
      ? Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
      : null;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-8"
    >
      {/* Hero: photo (or fallback colour) with a dark scrim + title. */}
      <View
        className="h-64 justify-end"
        style={{ backgroundColor: fallbackColor(trip.name) }}
      >
        {cover?.imageUrl ? (
          <ImageBackground
            source={{ uri: cover.imageUrl }}
            className="absolute inset-0"
            resizeMode="cover"
          />
        ) : null}
        <View className="absolute inset-0 bg-black/35" />

        <View className="p-5 gap-1">
          <Text className="text-white text-3xl font-bold" numberOfLines={2}>
            {trip.name}
          </Text>
          {dateRange ? (
            <Text className="text-white/90 text-base">{dateRange}</Text>
          ) : null}
        </View>

        {cover?.attribution ? (
          <Pressable
            className="absolute bottom-1.5 right-2"
            onPress={() => cover.sourceUrl && openUrl(cover.sourceUrl)}
            disabled={!cover.sourceUrl}
            hitSlop={8}
          >
            <Text className="text-white/70 text-[10px]">
              {t("trips.imageCredit", { source: cover.attribution })}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* At-a-glance facts. Grows as the trip gains optional fields. */}
      <View className="px-4 pt-4 flex-row flex-wrap gap-2">
        {days ? (
          <Fact icon="calendar" label={t("stats.days", { count: days })} />
        ) : null}
        <Fact icon="users" label={String(memberCount)} />
        <Fact icon="list" label={String(planCount)} />
        <Fact icon="bar-chart-2" label={formatEuros(totalCents)} />
      </View>
    </ScrollView>
  );
}
