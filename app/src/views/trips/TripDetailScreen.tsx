import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useCategories } from "../../domain/categories/useCategories";
import type { Expense } from "../../domain/expenses/types";
import { useExpenses } from "../../domain/expenses/useExpenses";
import { useTrip } from "../../domain/trips/useTrip";
import { formatEuros } from "../../lib/money";

export function TripDetailScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: trip } = useTrip(tripId);
  const { data: expenses = [], isLoading, error, refetch, isRefetching } =
    useExpenses(tripId);
  const { data: categories = [] } = useCategories();
  const [filter, setFilter] = useState<string | null>(null);

  const visible = filter
    ? expenses.filter((e) => e.category_code === filter)
    : expenses;
  const total = visible.reduce((sum, e) => sum + e.amount_cents, 0);

  function categoryLabel(code: string): string {
    return categories.find((c) => c.code === code)?.label ?? code;
  }

  return (
    <View style={styles.container}>
      {/* Dynamic title — Expo Router merges these options with the parent Stack. */}
      <Stack.Screen options={{ title: trip?.name ?? "Trip" }} />

      <View style={styles.header}>
        <Text style={styles.totalLabel}>
          {filter ? `Total · ${categoryLabel(filter)}` : "Total"}
        </Text>
        <Text style={styles.total}>{formatEuros(total)}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillsScroll}
        contentContainerStyle={styles.pillRow}
      >
        {/* Explicit "no filter" option — easier to reach than re-tapping
            the active pill, and reads better on screen. */}
        <Pressable
          onPress={() => setFilter(null)}
          style={[styles.pill, filter === null && styles.pillActive]}
        >
          <Text
            style={filter === null ? styles.pillTextActive : styles.pillText}
          >
            All
          </Text>
        </Pressable>
        {categories.map((c) => {
          const active = filter === c.code;
          return (
            <Pressable
              key={c.code}
              onPress={() => setFilter(c.code)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={active ? styles.pillTextActive : styles.pillText}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading && <ActivityIndicator />}

      {error && (
        <Text style={styles.errorText}>
          Could not load expenses: {String(error.message ?? error)}
        </Text>
      )}

      {!isLoading && visible.length === 0 && !error && (
        <Text style={styles.empty}>
          {filter
            ? "No expenses in this category yet."
            : "No expenses yet. Tap \"New expense\" to add one."}
        </Text>
      )}

      <FlatList
        data={visible}
        keyExtractor={(e, i) => e.id ?? String(i)}
        renderItem={({ item }: { item: Expense }) => (
          <Link
            href={`/trips/${tripId}/expenses/${item.id}/edit`}
            asChild
          >
            <Pressable style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.expenseDesc} numberOfLines={1}>
                  {item.description ?? categoryLabel(item.category_code)}
                </Text>
                <Text style={styles.expenseMeta}>
                  {categoryLabel(item.category_code)} · {item.expense_date}
                </Text>
              </View>
              <Text style={styles.expenseAmount}>
                {formatEuros(item.amount_cents)}
              </Text>
            </Pressable>
          </Link>
        )}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
      />

      <Link href={`/trips/${tripId}/expenses/new`} asChild>
        <Pressable style={styles.fab}>
          <Text style={styles.fabText}>+ New expense</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  header: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  totalLabel: { fontSize: 14, color: "#666" },
  total: { fontSize: 28, fontWeight: "700", color: "#0a6b2e" },
  // ``flexGrow: 0`` keeps the horizontal scroll from inheriting the
  // column's remaining vertical space; without it, the ScrollView grows
  // to fill the parent and ``alignItems: stretch`` (the default) blows
  // up each pill's height.
  pillsScroll: { flexGrow: 0, flexShrink: 0 },
  pillRow: {
    gap: 8,
    paddingRight: 16,
    alignItems: "center",
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#eee",
  },
  pillActive: { backgroundColor: "#0a6b2e" },
  pillText: { color: "#333" },
  pillTextActive: { color: "#fff", fontWeight: "600" },
  empty: { color: "#666", textAlign: "center", marginTop: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  expenseDesc: { fontSize: 16 },
  expenseMeta: { fontSize: 12, color: "#666" },
  expenseAmount: { fontSize: 16, fontWeight: "600" },
  errorText: { color: "#b00020", marginTop: 12 },
  fab: {
    backgroundColor: "#0a6b2e",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  fabText: { color: "#fff", fontWeight: "600" },
});
