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
import type { Plan } from "../../domain/plans/types";
import { usePlans } from "../../domain/plans/usePlans";
import { useTrip } from "../../domain/trips/useTrip";
import { formatEuros } from "../../lib/money";

type Tab = "expenses" | "plans";

/** Compact meta line for a plan: dates + duration, when present. */
function planMeta(plan: Plan): string {
  const parts: string[] = [];
  if (plan.start_date && plan.end_date && plan.start_date !== plan.end_date) {
    parts.push(`${plan.start_date} → ${plan.end_date}`);
  } else if (plan.start_date) {
    parts.push(plan.start_date);
  } else if (plan.end_date) {
    parts.push(plan.end_date);
  }
  if (plan.duration) parts.push(plan.duration);
  const linkCount = plan.links?.length ?? 0;
  if (linkCount > 0) parts.push(`🔗 ${linkCount}`);
  return parts.join(" · ");
}

export function TripDetailScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: trip } = useTrip(tripId);
  const { data: expenses = [], isLoading, error } = useExpenses(tripId);
  const { data: categories = [] } = useCategories();
  const { data: members = [] } = useMembers(tripId);
  const {
    data: plans = [],
    isLoading: plansLoading,
    error: plansError,
  } = usePlans(tripId);

  const [tab, setTab] = useState<Tab>("expenses");
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

      {/* Expenses / Plans toggle */}
      <View className="flex-row mx-4 mt-3 mb-1 bg-slate-100 rounded-2xl p-1">
        {(["expenses", "plans"] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl items-center ${
              tab === t ? "bg-surface shadow-card" : ""
            }`}
          >
            <Text
              className={
                tab === t
                  ? "text-ink-primary font-semibold"
                  : "text-ink-muted font-medium"
              }
            >
              {t === "expenses" ? "Expenses" : "Plans"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "expenses" ? (
        <>
          {/* Total summary */}
          <View className="px-4 pt-3 pb-3 gap-1">
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
              title={filter ? "No expenses in this category" : "No expenses yet"}
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
                          {item.plan_id ? " · 📌 Plan" : ""}
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
        </>
      ) : (
        /* Plans list */
        plansLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : plansError ? (
          <View className="px-4 pt-4">
            <Card className="bg-danger-50">
              <Text className="text-danger-500 font-semibold">
                Could not load plans
              </Text>
              <Text className="text-ink-secondary text-sm mt-1">
                {String(plansError.message ?? plansError)}
              </Text>
            </Card>
          </View>
        ) : plans.length === 0 ? (
          <EmptyState
            icon="plus"
            title="No plans yet"
            description="Tap the + button to add a plan for this trip."
          />
        ) : (
          <FlatList
            data={plans}
            keyExtractor={(p, i) => p.id ?? String(i)}
            contentContainerClassName="px-4 pt-4 pb-24 gap-2"
            renderItem={({ item }: { item: Plan }) => {
              const meta = planMeta(item);
              return (
                <Link href={`/trips/${tripId}/plans/${item.id}/edit`} asChild>
                  <Pressable>
                    <Card className="flex-row items-start gap-3">
                      <View className="flex-1">
                        <Text
                          className="text-base font-semibold text-ink-primary"
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text
                          className="text-sm text-ink-secondary mt-0.5"
                          numberOfLines={2}
                        >
                          {item.description}
                        </Text>
                        {meta ? (
                          <Text className="text-xs text-ink-muted mt-1">
                            {meta}
                          </Text>
                        ) : null}
                      </View>
                      {item.cost_cents != null ? (
                        <Text className="text-base font-semibold text-ink-primary">
                          {formatEuros(item.cost_cents)}
                        </Text>
                      ) : null}
                    </Card>
                  </Pressable>
                </Link>
              );
            }}
          />
        )
      )}

      <Link
        href={
          tab === "expenses"
            ? `/trips/${tripId}/expenses/new`
            : `/trips/${tripId}/plans/new`
        }
        asChild
      >
        <Pressable className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-brand-600 items-center justify-center shadow-card active:bg-brand-700">
          <Icon name="plus" size={26} color="#ffffff" />
        </Pressable>
      </Link>
    </View>
  );
}
