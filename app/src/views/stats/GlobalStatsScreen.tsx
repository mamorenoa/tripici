import { Stack } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Pill } from "../../components/Pill";
import type { CategoryStat, MonthStat, TripStat } from "../../domain/stats/types";
import { useGlobalStats } from "../../domain/stats/useGlobalStats";
import { formatEuros } from "../../lib/money";

// ── Bar helpers (shared with TripStatsScreen) ────────────────────

function HBar({ pct }: { pct: number }) {
  return (
    <View className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
      <View
        className="h-full bg-brand-600 rounded-full"
        style={{ width: `${Math.max(pct, 1)}%` }}
      />
    </View>
  );
}

// ── Section: by category ─────────────────────────────────────────

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

// ── Section: by trip ─────────────────────────────────────────────

function TripSection({
  rows,
  totalCents,
}: {
  rows: TripStat[];
  totalCents: number;
}) {
  return (
    <Card className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        By trip
      </Text>
      {rows.map((r) => {
        const pct = totalCents > 0 ? (r.total_cents / totalCents) * 100 : 0;
        return (
          <View key={r.trip_id} className="gap-1">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-ink-primary flex-1 mr-2" numberOfLines={1}>
                {r.trip_name}
              </Text>
              <Text className="text-sm font-semibold text-ink-primary">
                {formatEuros(r.total_cents)}
              </Text>
            </View>
            <HBar pct={pct} />
          </View>
        );
      })}
    </Card>
  );
}

// ── Section: by month ────────────────────────────────────────────

function MonthSection({ rows }: { rows: MonthStat[] }) {
  const max = Math.max(...rows.map((r) => r.total_cents), 1);
  return (
    <Card className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        By month
      </Text>
      <View className="flex-row items-end gap-1 h-24">
        {rows.map((r) => {
          const heightPct = (r.total_cents / max) * 100;
          const label = r.month.slice(5); // "MM" from "YYYY-MM"
          return (
            <View key={r.month} className="flex-1 items-center gap-1">
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

export function GlobalStatsScreen() {
  const [activeFilter, setActiveFilter] = useState<string | undefined>(
    undefined
  );
  const { data: stats, isLoading, error } = useGlobalStats(activeFilter);

  const activeLabel = activeFilter
    ? stats?.by_category.find((c) => c.category_code === activeFilter)?.label
    : undefined;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: "All trips" }} />

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
      ) : !stats || (stats.total_cents === 0 && !activeFilter) ? (
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            title="No expenses yet"
            description="Add expenses to your trips to see statistics here."
          />
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-4 py-4 gap-4 pb-10">
          {/* Total */}
          <View className="gap-1">
            <Text className="text-sm text-ink-secondary">
              {activeLabel ? `Total · ${activeLabel}` : "Total · All trips"}
            </Text>
            <Text className="text-4xl font-bold text-brand-600">
              {formatEuros(stats.total_cents)}
            </Text>
          </View>

          {/* Category filter pills — always unfiltered */}
          {stats.by_category.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 items-center pr-4"
              className="flex-grow-0 flex-shrink-0 -mx-4 px-4"
            >
              <Pill
                label="All"
                active={!activeFilter}
                onPress={() => setActiveFilter(undefined)}
              />
              {stats.by_category.map((c) => (
                <Pill
                  key={c.category_code}
                  label={c.label}
                  active={activeFilter === c.category_code}
                  onPress={() => setActiveFilter(c.category_code)}
                />
              ))}
            </ScrollView>
          )}

          {/* By category — only shown when no filter is active */}
          {!activeFilter && stats.by_category.length > 0 && (
            <CategorySection rows={stats.by_category} />
          )}

          {/* By trip */}
          {stats.by_trip.length > 0 && (
            <TripSection rows={stats.by_trip} totalCents={stats.total_cents} />
          )}

          {/* By month — only shown when more than one month */}
          {stats.by_month.length > 1 && (
            <MonthSection rows={stats.by_month} />
          )}
        </ScrollView>
      )}
    </View>
  );
}
