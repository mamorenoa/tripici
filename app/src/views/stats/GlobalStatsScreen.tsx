import { Stack } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Pill } from "../../components/Pill";
import { useCategoryLabel } from "../../domain/categories/useCategoryLabel";
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
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  return (
    <Card className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        {t("stats.byCategory")}
      </Text>
      {rows.map((r) => (
        <View key={r.category_code} className="gap-1">
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-ink-primary">
              {categoryLabel(r.category_code, r.label)}
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

// ── Section: by trip ─────────────────────────────────────────────

type SortKey = "total" | "daily";
type SortDir = "desc" | "asc";

function metric(r: TripStat, key: SortKey): number {
  return key === "total" ? r.total_cents : r.daily_cents;
}

function TripSection({
  rows,
  sortKey,
  sortDir,
  onSortKey,
  onToggleDir,
}: {
  rows: TripStat[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSortKey: (k: SortKey) => void;
  onToggleDir: () => void;
}) {
  const sorted = [...rows].sort((a, b) => {
    const diff = metric(a, sortKey) - metric(b, sortKey);
    return sortDir === "desc" ? -diff : diff;
  });
  const max = Math.max(...sorted.map((r) => metric(r, sortKey)), 1);
  const { t } = useTranslation();

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
          {t("stats.byTrip")}
        </Text>
        <View className="flex-row items-center gap-2">
          <Pill
            label={t("stats.total")}
            active={sortKey === "total"}
            onPress={() => onSortKey("total")}
          />
          <Pill
            label={t("stats.perDay")}
            active={sortKey === "daily"}
            onPress={() => onSortKey("daily")}
          />
          <Pill
            label={sortDir === "desc" ? t("stats.sortHigh") : t("stats.sortLow")}
            active={false}
            onPress={onToggleDir}
          />
        </View>
      </View>
      {sorted.map((r) => {
        const pct = (metric(r, sortKey) / max) * 100;
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
            <View className="flex-row items-center gap-2">
              <HBar pct={pct} />
              <Text className="text-xs text-ink-muted">
                {t("stats.dailyPerDay", { amount: formatEuros(r.daily_cents) })}
              </Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

// ── Section: by month ────────────────────────────────────────────

function MonthSection({ rows }: { rows: MonthStat[] }) {
  const { t } = useTranslation();
  const max = Math.max(...rows.map((r) => r.total_cents), 1);
  return (
    <Card className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        {t("stats.byMonth")}
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
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const [activeFilter, setActiveFilter] = useState<string | undefined>(
    undefined
  );
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { data: stats, isLoading, error } = useGlobalStats(activeFilter);

  const activeCategory = activeFilter
    ? stats?.by_category.find((c) => c.category_code === activeFilter)
    : undefined;
  const activeLabel = activeCategory
    ? categoryLabel(activeCategory.category_code, activeCategory.label)
    : undefined;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: t("nav.allTrips") }} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-ink-muted text-center">
            {t("stats.loadError")}
          </Text>
        </View>
      ) : !stats || (stats.total_cents === 0 && !activeFilter) ? (
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            title={t("stats.emptyTitle")}
            description={t("stats.globalEmptyDescription")}
          />
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-4 py-4 gap-4 pb-10">
          {/* Total */}
          <View className="gap-1">
            <Text className="text-sm text-ink-secondary">
              {activeLabel
                ? t("expenses.totalCategory", { category: activeLabel })
                : t("stats.globalTotalAll")}
            </Text>
            <Text className="text-4xl font-bold text-brand-600">
              {formatEuros(stats.total_cents)}
            </Text>
            <Text className="text-sm text-ink-muted">
              {t("stats.yourShare", {
                amount: formatEuros(stats.personal_total_cents),
              })}
              <Text className="text-ink-muted">{t("stats.yourShareNote")}</Text>
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
                label={t("common.all")}
                active={!activeFilter}
                onPress={() => setActiveFilter(undefined)}
              />
              {stats.by_category.map((c) => (
                <Pill
                  key={c.category_code}
                  label={categoryLabel(c.category_code, c.label)}
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
            <TripSection
              rows={stats.by_trip}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortKey={setSortKey}
              onToggleDir={() =>
                setSortDir((d) => (d === "desc" ? "asc" : "desc"))
              }
            />
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
