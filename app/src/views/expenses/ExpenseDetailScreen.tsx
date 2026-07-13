import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { useCategoryLabel } from "../../domain/categories/useCategoryLabel";
import { useExpenses } from "../../domain/expenses/useExpenses";
import { useMembers } from "../../domain/members/useMembers";
import { formatEuros } from "../../lib/money";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text className="text-xs text-ink-muted">{label}</Text>
      <Text className="text-base text-ink-primary">{value}</Text>
    </View>
  );
}

export function ExpenseDetailScreen() {
  const { id: tripId, expenseId } = useLocalSearchParams<{
    id: string;
    expenseId: string;
  }>();
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const { data: expenses, isLoading } = useExpenses(tripId);
  const { data: members = [] } = useMembers(tripId);

  const expense = expenses?.find((e) => e.id === expenseId);

  if (isLoading || !expense) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  const payerLabel =
    expense.paid_by_user_id == null
      ? t("expenses.common")
      : (members.find((m) => m.user_id === expense.paid_by_user_id)
          ?.display_name ?? "—");

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link
              href={`/trips/${tripId}/expenses/${expenseId}/edit`}
              asChild
            >
              <Pressable className="px-3 py-2 flex-row items-center gap-1.5">
                <Icon name="edit-2" size={18} color="#059669" />
                <Text className="text-brand-600 font-semibold text-sm">
                  {t("common.edit")}
                </Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <ScrollView contentContainerClassName="px-4 py-4 gap-4">
        <Card className="gap-4">
          <Text className="text-3xl font-bold text-brand-600">
            {formatEuros(expense.amount_cents)}
          </Text>
          <Field
            label={t("expenses.category")}
            value={categoryLabel(expense.category_code)}
          />
          <Field label={t("expenses.date")} value={expense.expense_date ?? "—"} />
          <Field label={t("expenses.paidBy")} value={payerLabel} />
          {expense.description ? (
            <Field
              label={t("expenses.description")}
              value={expense.description}
            />
          ) : null}
        </Card>
      </ScrollView>
    </View>
  );
}
