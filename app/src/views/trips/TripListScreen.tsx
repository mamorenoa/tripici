import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { useCurrentUser } from "../../domain/auth/useCurrentUser";
import { useLogout } from "../../domain/auth/useLogout";
import type { Trip } from "../../domain/trips/types";
import { useTrips } from "../../domain/trips/useTrips";
import { activeLocaleTag } from "../../lib/i18n";
import { colors } from "../../lib/theme";

// Each trip gets a stable coloured tile (light bg + saturated icon),
// picked deterministically from its id — same trip, same colour. Gives the
// list life without needing a trip "type".
const TRIP_TINTS = [
  { bg: "#ccfbf1", fg: "#0d9488" }, // teal
  { bg: "#fef3c7", fg: "#d97706" }, // amber
  { bg: "#e0f2fe", fg: "#0284c7" }, // sky
  { bg: "#ede9fe", fg: "#7c3aed" }, // violet
  { bg: "#ffe4e6", fg: "#e11d48" }, // rose
  { bg: "#dcfce7", fg: "#16a34a" }, // green
];

function tripTint(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TRIP_TINTS[h % TRIP_TINTS.length];
}

export function TripListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const { data, isLoading, error, refetch, isRefetching } = useTrips();

  return (
    // Centre the app in a max-width column so it reads as a phone-shaped
    // column on desktop rather than stretching edge to edge.
    <View className="flex-1 bg-background items-center">
     <View className="flex-1 w-full self-center" style={{ maxWidth: 672 }}>
      {/* Branded top bar (own header — native one is hidden for home). */}
      <View
        style={{ paddingTop: insets.top }}
        className="bg-surface border-b border-border"
      >
        <View className="px-4 h-16 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1">
            <Avatar name={user?.display_name ?? "?"} size={40} />
            <Text
              className="text-lg font-semibold text-ink-primary flex-1"
              numberOfLines={1}
            >
              {t("trips.greeting")} {user?.display_name ?? ""}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Link href="/stats" asChild>
              <Pressable
                className="p-2"
                accessibilityRole="link"
                accessibilityLabel={t("common.stats")}
              >
                <Icon name="bar-chart-2" size={20} color={colors.ink.secondary} />
              </Pressable>
            </Link>
            <LanguageSwitcher />
            <Pressable
              className="p-2"
              onPress={() => logout.mutate()}
              disabled={logout.isPending}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              <Icon name="log-out" size={20} color={colors.ink.secondary} />
            </Pressable>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View className="px-4 pt-4">
          <Card className="bg-danger-50 border border-danger-500/30">
            <Text className="text-danger-500 font-semibold">
              {t("trips.loadError")}
            </Text>
            <Text className="text-ink-secondary text-sm mt-1">
              {String(error.message ?? error)}
            </Text>
            <Button
              variant="secondary"
              size="sm"
              className="self-start mt-3"
              onPress={() => refetch()}
            >
              {t("common.retry")}
            </Button>
          </Card>
        </View>
      ) : data && data.length === 0 ? (
        <View className="flex-1">
          <SectionHeading />
          <EmptyState
            icon="compass"
            title={t("trips.emptyTitle")}
            description={t("trips.emptyDescription")}
          />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(trip, index) => trip.id ?? String(index)}
          ListHeaderComponent={SectionHeading}
          contentContainerClassName="px-4 pb-24 gap-3"
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          renderItem={({ item }: { item: Trip }) => {
            const isShared =
              !!user && !!item.owner_id && item.owner_id !== user.id;
            const tint = tripTint(item.id ?? item.name);
            return (
              <Link href={`/trips/${item.id}`} asChild>
                <Pressable>
                  <Card className="flex-row items-center gap-3 border border-border">
                    <View
                      className="w-12 h-12 rounded-xl items-center justify-center"
                      style={{ backgroundColor: tint.bg }}
                    >
                      <Icon name="compass" size={22} color={tint.fg} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text
                          className="text-base font-semibold text-ink-primary flex-shrink"
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        {isShared ? (
                          <View className="px-2 py-0.5 rounded-full bg-background border border-border">
                            <Text className="text-[10px] font-semibold uppercase tracking-wide text-ink-secondary">
                              {t("trips.sharedBadge")}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {item.created_at ? (
                        <Text className="text-xs text-ink-muted mt-0.5">
                          {new Date(item.created_at).toLocaleDateString(
                            activeLocaleTag(),
                          )}
                        </Text>
                      ) : null}
                    </View>
                    <Icon
                      name="chevron-right"
                      size={18}
                      color={colors.ink.muted}
                    />
                  </Card>
                </Pressable>
              </Link>
            );
          }}
        />
      )}

      {/* FAB */}
      <Link href="/trips/new" asChild>
        <Pressable className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-brand-600 items-center justify-center shadow-card active:bg-brand-700">
          <Icon name="plus" size={26} color={colors.white} />
        </Pressable>
      </Link>
     </View>
    </View>
  );
}

/** "Your adventures" title + subtitle, scrolls with the list. */
function SectionHeading() {
  const { t } = useTranslation();
  return (
    <View className="gap-1 pt-5 pb-2">
      <Text className="text-2xl font-bold text-ink-primary tracking-tight">
        {t("trips.homeTitle")}
      </Text>
      <Text className="text-sm text-ink-secondary">
        {t("trips.homeSubtitle")}
      </Text>
    </View>
  );
}
