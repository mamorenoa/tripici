import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { useCurrentUser } from "../../domain/auth/useCurrentUser";
import { useCategories } from "../../domain/categories/useCategories";
import { useCategoryLabel } from "../../domain/categories/useCategoryLabel";
import type { Expense } from "../../domain/expenses/types";
import { useExpenses } from "../../domain/expenses/useExpenses";
import { useMembers } from "../../domain/members/useMembers";
import type { Plan } from "../../domain/plans/types";
import { usePlans } from "../../domain/plans/usePlans";
import { useTrip } from "../../domain/trips/useTrip";
import { formatEuros } from "../../lib/money";
import { PlanCalendar } from "../plans/PlanCalendar";
import { PlanCard } from "../plans/PlanCard";
import { sortPlans, type PlanSort } from "../plans/planUtils";

type Tab = "expenses" | "plans";
type PlanView = "list" | "calendar";

export function TripDetailScreen() {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: trip } = useTrip(tripId);
  const { data: currentUser } = useCurrentUser();
  const isOwner = !!currentUser && !!trip && currentUser.id === trip.owner_id;
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
  const [planSort, setPlanSort] = useState<PlanSort>("soonest");
  const [planView, setPlanView] = useState<PlanView>("list");

  const orderedPlans = sortPlans(plans, planSort);

  const visible = filter
    ? expenses.filter((e) => e.category_code === filter)
    : expenses;
  const total = visible.reduce((sum, e) => sum + e.amount_cents, 0);
  // null payer == a common expense, split across members in the stats.
  const payerLabel = (userId: string | null | undefined) =>
    userId == null
      ? t("expenses.common")
      : members.find((m) => m.user_id === userId)?.display_name ?? "—";

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: trip?.name ?? "Trip",
          headerRight: () => (
            <View className="flex-row items-center">
              {isOwner ? (
                <Link href={`/trips/${tripId}/edit`} asChild>
                  <Pressable className="px-3 py-2 flex-row items-center gap-1.5">
                    <Icon name="edit-2" size={18} color="#059669" />
                  </Pressable>
                </Link>
              ) : null}
              <Link href={`/trips/${tripId}/settle`} asChild>
                <Pressable className="px-3 py-2 flex-row items-center gap-1.5">
                  <Icon name="divide" size={18} color="#059669" />
                  <Text className="text-brand-600 font-semibold text-sm">
                    {t("trips.navSettle")}
                  </Text>
                </Pressable>
              </Link>
              <Link href={`/trips/${tripId}/stats`} asChild>
                <Pressable className="px-3 py-2 flex-row items-center gap-1.5">
                  <Icon name="bar-chart-2" size={18} color="#059669" />
                  <Text className="text-brand-600 font-semibold text-sm">
                    {t("trips.navStats")}
                  </Text>
                </Pressable>
              </Link>
              <Link href={`/trips/${tripId}/members`} asChild>
                <Pressable className="px-3 py-2 flex-row items-center gap-1.5">
                  <Icon name="users" size={18} color="#059669" />
                  <Text className="text-brand-600 font-semibold">
                    {t("trips.navMembers")}
                  </Text>
                </Pressable>
              </Link>
            </View>
          ),
        }}
      />

      {/* Expenses / Plans toggle */}
      <View className="flex-row mx-4 mt-3 mb-1 bg-slate-100 rounded-2xl p-1">
        {(["expenses", "plans"] as Tab[]).map((tabKey) => (
          <Pressable
            key={tabKey}
            onPress={() => setTab(tabKey)}
            className={`flex-1 py-2 rounded-xl items-center ${
              tab === tabKey ? "bg-surface shadow-card" : ""
            }`}
          >
            <Text
              className={
                tab === tabKey
                  ? "text-ink-primary font-semibold"
                  : "text-ink-muted font-medium"
              }
            >
              {tabKey === "expenses"
                ? t("trips.tabExpenses")
                : t("trips.tabPlans")}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "expenses" ? (
        <>
          {/* Total summary */}
          <View className="px-4 pt-3 pb-3 gap-1">
            <Text className="text-sm text-ink-secondary">
              {filter
                ? t("expenses.totalCategory", { category: categoryLabel(filter) })
                : t("expenses.total")}
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
              label={t("common.all")}
              active={filter === null}
              onPress={() => setFilter(null)}
            />
            {categories.map((c) => (
              <Pill
                key={c.code}
                label={categoryLabel(c.code, c.label)}
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
                  {t("expenses.loadError")}
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
                filter
                  ? t("expenses.emptyFilteredTitle")
                  : t("expenses.emptyTitle")
              }
              description={
                filter
                  ? t("expenses.emptyFilteredDescription")
                  : t("expenses.emptyDescription")
              }
            />
          ) : (
            <FlatList
              data={visible}
              keyExtractor={(e, i) => e.id ?? String(i)}
              contentContainerClassName="px-4 pt-2 pb-24 gap-2"
              renderItem={({ item }: { item: Expense }) => (
                <Link href={`/trips/${tripId}/expenses/${item.id}`} asChild>
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
                          {item.plan_id ? ` · 📌 ${t("expenses.fromPlan")}` : ""}
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
                {t("plans.loadError")}
              </Text>
              <Text className="text-ink-secondary text-sm mt-1">
                {String(plansError.message ?? plansError)}
              </Text>
            </Card>
          </View>
        ) : plans.length === 0 ? (
          <EmptyState
            icon="plus"
            title={t("plans.emptyTitle")}
            description={t("plans.emptyDescription")}
          />
        ) : (
          <View className="flex-1">
            <View className="px-4 pt-3 pb-1 flex-row items-center justify-between">
              {planView === "list" ? (
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs text-ink-muted">
                    {t("plans.sort")}
                  </Text>
                  <Pill
                    label={t("plans.sortSoonest")}
                    active={planSort === "soonest"}
                    onPress={() => setPlanSort("soonest")}
                  />
                  <Pill
                    label={t("plans.sortLatest")}
                    active={planSort === "latest"}
                    onPress={() => setPlanSort("latest")}
                  />
                </View>
              ) : (
                <View />
              )}
              <View className="flex-row items-center gap-1">
                <Pressable
                  onPress={() => setPlanView("list")}
                  hitSlop={6}
                  className="p-1.5"
                >
                  <Icon
                    name="list"
                    size={20}
                    color={planView === "list" ? "#059669" : "#94a3b8"}
                  />
                </Pressable>
                <Pressable
                  onPress={() => setPlanView("calendar")}
                  hitSlop={6}
                  className="p-1.5"
                >
                  <Icon
                    name="calendar"
                    size={20}
                    color={planView === "calendar" ? "#059669" : "#94a3b8"}
                  />
                </Pressable>
              </View>
            </View>
            {planView === "list" ? (
              <FlatList
                data={orderedPlans}
                keyExtractor={(p, i) => p.id ?? String(i)}
                contentContainerClassName="px-4 pt-2 pb-24 gap-2"
                renderItem={({ item }: { item: Plan }) => (
                  <PlanCard plan={item} tripId={tripId} />
                )}
              />
            ) : (
              <PlanCalendar
                plans={plans}
                tripId={tripId}
                tripStart={trip?.start_date}
                tripEnd={trip?.end_date}
              />
            )}
          </View>
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
