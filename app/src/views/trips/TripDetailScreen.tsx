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
import { Icon, type IconName } from "../../components/Icon";
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
import { colors } from "../../lib/theme";
import { categoryIcon } from "../expenses/categoryIcon";
import { PlanCalendar } from "../plans/PlanCalendar";
import { PlanCard } from "../plans/PlanCard";
import { sortPlans, type PlanSort } from "../plans/planUtils";
import { TripCover } from "./TripCover";

type Tab = "overview" | "expenses" | "plans";
type PlanView = "list" | "calendar";

/** Icon-only trip-level action in the native header (redesign R3). */
function HeaderAction({
  href,
  icon,
  label,
}: {
  href: React.ComponentProps<typeof Link>["href"];
  icon: IconName;
  label: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        className="px-2 py-2"
      >
        <Icon name={icon} size={20} color={colors.ink.secondary} />
      </Pressable>
    </Link>
  );
}

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

  const [tab, setTab] = useState<Tab>("overview");
  const [filter, setFilter] = useState<string | null>(null);
  const [planSort, setPlanSort] = useState<PlanSort>("soonest");
  const [planView, setPlanView] = useState<PlanView>("list");

  const orderedPlans = sortPlans(plans, planSort);

  const visible = filter
    ? expenses.filter((e) => e.category_code === filter)
    : expenses;
  const total = visible.reduce((sum, e) => sum + e.amount_cents, 0);
  const totalAll = expenses.reduce((sum, e) => sum + e.amount_cents, 0);
  // null payer == a common expense, split across members in the stats.
  const payerLabel = (userId: string | null | undefined) =>
    userId == null
      ? t("expenses.common")
      : members.find((m) => m.user_id === userId)?.display_name ?? "—";

  return (
    <View className="flex-1 bg-background items-center">
     <View className="flex-1 w-full" style={{ maxWidth: 672 }}>
      <Stack.Screen
        options={{
          title: trip?.name ?? "Trip",
          headerRight: () => (
            <View className="flex-row items-center">
              {isOwner ? (
                <HeaderAction
                  href={`/trips/${tripId}/edit`}
                  icon="edit-2"
                  label={t("common.edit")}
                />
              ) : null}
              <HeaderAction
                href={`/trips/${tripId}/settle`}
                icon="credit-card"
                label={t("trips.navSettle")}
              />
              <HeaderAction
                href={`/trips/${tripId}/stats`}
                icon="bar-chart-2"
                label={t("trips.navStats")}
              />
              <HeaderAction
                href={`/trips/${tripId}/members`}
                icon="users"
                label={t("trips.navMembers")}
              />
            </View>
          ),
        }}
      />

      {/* Underline tab bar (Cover / Plans / Expenses) */}
      <View className="flex-row bg-surface border-b border-border">
        {(["overview", "plans", "expenses"] as Tab[]).map((tabKey) => {
          const active = tab === tabKey;
          return (
            <Pressable
              key={tabKey}
              onPress={() => setTab(tabKey)}
              className={`flex-1 py-4 items-center border-b-2 ${
                active ? "border-brand-600" : "border-transparent"
              }`}
            >
              <Text
                className={`text-xs font-semibold uppercase tracking-widest ${
                  active ? "text-brand-600" : "text-ink-secondary"
                }`}
              >
                {tabKey === "overview"
                  ? t("trips.tabOverview")
                  : tabKey === "expenses"
                    ? t("trips.tabExpenses")
                    : t("trips.tabPlans")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "overview" ? (
        trip ? (
          <TripCover
            trip={trip}
            totalCents={totalAll}
            planCount={plans.length}
            memberCount={members.length}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        )
      ) : tab === "expenses" ? (
        <>
          {/* Total summary */}
          <View className="px-4 pt-4 pb-3 gap-1">
            <Text className="text-xs font-semibold uppercase tracking-widest text-ink-secondary">
              {filter
                ? t("expenses.totalCategory", { category: categoryLabel(filter) })
                : t("stats.totalSpent")}
            </Text>
            <Text className="text-3xl font-bold text-ink-primary">
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
              contentContainerClassName="px-4 pt-1 pb-24"
              renderItem={({ item }: { item: Expense }) => (
                <Link href={`/trips/${tripId}/expenses/${item.id}`} asChild>
                  <Pressable className="flex-row items-center justify-between py-4 border-b border-border">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="w-12 h-12 rounded-2xl bg-background items-center justify-center">
                        <Icon
                          name={categoryIcon(item.category_code)}
                          size={22}
                          color={colors.brand[600]}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-base font-semibold text-ink-primary"
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text
                          className="text-xs text-ink-muted mt-0.5"
                          numberOfLines={1}
                        >
                          {categoryLabel(item.category_code)} · {item.expense_date}
                          {" · "}
                          {payerLabel(item.paid_by_user_id)}
                          {item.plan_id ? ` · 📌 ${t("expenses.fromPlan")}` : ""}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-base font-semibold text-ink-primary ml-3">
                      {formatEuros(item.amount_cents)}
                    </Text>
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
            <View className="px-4 pt-4 pb-1 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-ink-primary">
                {t("plans.itinerary")}
              </Text>
              <View className="flex-row items-center bg-background rounded-lg p-1">
                <Pressable
                  onPress={() => setPlanView("list")}
                  className={`p-1.5 rounded ${
                    planView === "list" ? "bg-surface shadow-card" : ""
                  }`}
                >
                  <Icon
                    name="list"
                    size={18}
                    color={
                      planView === "list" ? colors.brand[600] : colors.ink.muted
                    }
                  />
                </Pressable>
                <Pressable
                  onPress={() => setPlanView("calendar")}
                  className={`p-1.5 rounded ${
                    planView === "calendar" ? "bg-surface shadow-card" : ""
                  }`}
                >
                  <Icon
                    name="calendar"
                    size={18}
                    color={
                      planView === "calendar"
                        ? colors.brand[600]
                        : colors.ink.muted
                    }
                  />
                </Pressable>
              </View>
            </View>
            {planView === "list" ? (
              <View className="px-4 pb-1 flex-row items-center gap-2">
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
            ) : null}
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

      {tab !== "overview" ? (
        <Link
          href={
            tab === "expenses"
              ? `/trips/${tripId}/expenses/new`
              : `/trips/${tripId}/plans/new`
          }
          asChild
        >
          <Pressable className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-brand-600 items-center justify-center shadow-card active:bg-brand-700">
            <Icon name="plus" size={26} color={colors.white} />
          </Pressable>
        </Link>
      ) : null}
     </View>
    </View>
  );
}
