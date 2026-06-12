import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { Avatar } from "../../components/Avatar";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import type { CategoryStat, DateStat, MemberStat } from "../../domain/stats/types";
import { useTripStats } from "../../domain/stats/useTripStats";
import { useTrip } from "../../domain/trips/useTrip";
import { formatEuros } from "../../lib/money";

// ── Bar helpers ────────────────────────────────────────────────────

function HBar({ pct }: { pct: number }) {
  return (
    <View className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
      <View
        className="h-full bg-brand-600 rounded-full"
        style={{ width: `${pct}%` }}
      />
    </View>
  );
}

// ── Section: by category ──────────────────────────────────────────

function CategorySection({ rows }: { rows: CategoryStat[] }) {
  return (
    <Card className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        By category
      </Text>
      {rows.map((r) => (
        <View key={r.category_code} className="gap-1">
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-ink-primary">{r.label}</Text>
            <Text className="text-sm font-semibold text-ink-primary">
              {formatEuros(r.total_cents)}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <HBar pct={r.pct} />
            <Text className="text-xs text-ink-muted w-10 text-right">
              {r.pct.toFixed(1)}%
            </Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

// ── Section: by member ────────────────────────────────────────────

function MemberSection({ rows }: { rows: MemberStat[] }) {
  return (
    <Card className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        By person
      </Text>
      {rows.map((r) => (
        <View key={r.user_id} className="gap-1">
          <View className="flex-row items-center gap-2">
            <Avatar name={r.display_name} size={24} />
            <Text className="flex-1 text-sm text-ink-primary">
              {r.display_name}
            </Text>
            <Text className="text-sm font-semibold text-ink-primary">
              {formatEuros(r.total_cents)}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <HBar pct={r.pct} />
            <Text className="text-xs text-ink-muted w-10 text-right">
              {r.pct.toFixed(1)}%
            </Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

// ── Section: by date ──────────────────────────────────────────────

function DateSection({ rows }: { rows: DateStat[] }) {
  const max = Math.max(...rows.map((r) => r.total_cents), 1);
  return (
    <Card className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        By day
      </Text>
      <View className="flex-row items-end gap-1 h-24">
        {rows.map((r) => {
          const heightPct = (r.total_cents / max) * 100;
          const label = r.date.slice(5); // "MM-DD"
          return (
            <View key={r.date} className="flex-1 items-center gap-1">
              <View className="flex-1 w-full justify-end">
                <View
                  className="w-full bg-brand-600 rounded-t-sm"
                  style={{ height: `${heightPct}%` }}
                />
              </View>
              <Text className="text-[10px] text-ink-muted">{label}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

// ── Screen ────────────────────────────────────────────────────────

export function TripStatsScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: trip } = useTrip(tripId);
  const { data: stats, isLoading, error } = useTripStats(tripId);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: trip?.name ? `${trip.name} · Stats` : "Stats" }} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-ink-muted text-center">
            Could not load statistics.
          </Text>
        </View>
      ) : !stats || stats.total_cents === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            title="No expenses yet"
            description="Add some expenses to see statistics for this trip."
          />
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-4 py-4 gap-4 pb-10">
          {/* Total */}
          <View className="gap-1">
            <Text className="text-sm text-ink-secondary">Total spent</Text>
            <Text className="text-4xl font-bold text-brand-600">
              {formatEuros(stats.total_cents)}
            </Text>
          </View>

          {stats.by_category.length > 0 && (
            <CategorySection rows={stats.by_category} />
          )}
          {stats.by_member.length > 0 && (
            <MemberSection rows={stats.by_member} />
          )}
          {stats.by_date.length > 1 && (
            <DateSection rows={stats.by_date} />
          )}
        </ScrollView>
      )}
    </View>
  );
}
