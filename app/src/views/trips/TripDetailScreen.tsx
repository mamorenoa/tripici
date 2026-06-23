import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { Pill } from "../../components/Pill";
import { useCategories } from "../../domain/categories/useCategories";
import type { Expense } from "../../domain/expenses/types";
import { useExpenses } from "../../domain/expenses/useExpenses";
import { useMembers } from "../../domain/members/useMembers";
import { useTrip } from "../../domain/trips/useTrip";
import { formatEuros } from "../../lib/money";

export function TripDetailScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: trip } = useTrip(tripId);
  const { data: expenses = [], isLoading, error } = useExpenses(tripId);
  const { data: categories = [] } = useCategories();
  const { data: members = [] } = useMembers(tripId);
  const [filter, setFilter] = useState<string | null>(null);

  const visible = filter
    ? expenses.filter((e) => e.category_code === filter)
    : expenses;
  const total = visible.reduce((sum, e) => sum + e.amount_cents, 0);
  const categoryLabel = (code: string) =>
    categories.find((c) => c.code === code)?.label ?? code;
  // null payer == a common expense, split across members in the stats.
  const payerLabel = (userId: string | null | undefined) =>
    userId == null
      ? "Common"
      : members.find((m) => m.user_id === userId)?.display_name ?? "—";

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: trip?.name ?? "Trip",
          headerRight: () => (
            <View className="flex-row items-center">
              <Link href={`/trips/${tripId}/settle`} asChild>
                <Pressable className="px-3 py-2 flex-row items-center gap-1.5">
                  <Icon name="divide" size={18} color="#059669" />
                  <Text className="text-brand-600 font-semibold text-sm">
                    Settle
                  </Text>
                </Pressable>
              </Link>
              <Link href={`/trips/${tripId}/stats`} asChild>
                <Pressable className="px-3 py-2 flex-row items-center gap-1.5">
                  <Icon name="bar-chart-2" size={18} color="#059669" />
                  <Text className="text-brand-600 font-semibold text-sm">
                    Stats
                  </Text>
                </Pressable>
              </Link>
              <Link href={`/trips/${tripId}/members`} asChild>
                <Pressable className="px-3 py-2 flex-row items-center gap-1.5">
                  <Icon name="users" size={18} color="#059669" />
                  <Text className="text-brand-600 font-semibold">Members</Text>
                </Pressable>
              </Link>
            </View>
          ),
        }}
      />

      {/* Total summary */}
      <View className="px-4 pt-4 pb-3 gap-1">
        <Text className="text-sm text-ink-secondary">
          {filter ? `Total · ${categoryLabel(filter)}` : "Total"}
        </Text>
        <Text className="text-4xl font-bold text-brand-600">
          {formatEuros(total)}
        </Text>
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 py-2 gap-2 items-center"
        className="flex-grow-0 flex-shrink-0"
      >
        <Pill
          label="All"
          active={filter === null}
          onPress={() => setFilter(null)}
        />
        {categories.map((c) => (
          <Pill
            key={c.code}
            label={c.label}
            active={filter === c.code}
            onPress={() => setFilter(c.code)}
          />
        ))}
      </ScrollView>

      {/* Expense list */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View className="px-4 pt-2">
          <Card className="bg-danger-50">
            <Text className="text-danger-500 font-semibold">
              Could not load expenses
            </Text>
            <Text className="text-ink-secondary text-sm mt-1">
              {String(error.message ?? error)}
            </Text>
          </Card>
        </View>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="plus"
          title={
            filter ? "No expenses in this category" : "No expenses yet"
          }
          description={
            filter
              ? "Pick another category or add one below."
              : "Tap the + button to log your first expense."
          }
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(e, i) => e.id ?? String(i)}
          contentContainerClassName="px-4 pt-2 pb-24 gap-2"
          renderItem={({ item }: { item: Expense }) => (
            <Link href={`/trips/${tripId}/expenses/${item.id}/edit`} asChild>
              <Pressable>
                <Card className="flex-row items-center gap-3">
                  <View className="flex-1">
                    <Text
                      className="text-base text-ink-primary"
                      numberOfLines={1}
                    >
                      {item.description ?? categoryLabel(item.category_code)}
                    </Text>
                    <Text className="text-xs text-ink-muted mt-0.5">
                      {categoryLabel(item.category_code)} · {item.expense_date}
                      {" · "}
                      {payerLabel(item.paid_by_user_id)}
                    </Text>
                  </View>
                  <Text className="text-base font-semibold text-ink-primary">
                    {formatEuros(item.amount_cents)}
                  </Text>
                </Card>
              </Pressable>
            </Link>
          )}
        />
      )}

      <Link href={`/trips/${tripId}/expenses/new`} asChild>
        <Pressable className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-brand-600 items-center justify-center shadow-card active:bg-brand-700">
          <Icon name="plus" size={26} color="#ffffff" />
        </Pressable>
      </Link>
    </View>
  );
}
