import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { DateInput } from "../../components/DateInput";
import { Input } from "../../components/Input";
import { Pill } from "../../components/Pill";
import { useCurrentUser } from "../../domain/auth/useCurrentUser";
import { useCategories } from "../../domain/categories/useCategories";
import { useCategoryLabel } from "../../domain/categories/useCategoryLabel";
import type { Expense, ExpenseCreate } from "../../domain/expenses/types";
import { useMembers } from "../../domain/members/useMembers";
import { parseEurosToCents } from "../../lib/money";

type Props = {
  /** The trip this expense belongs to — used to load the member list
   * for the "Paid by" selector. */
  tripId: string;
  /** When provided, the form acts as "edit" with pre-filled values. */
  initialValue?: Expense;
  submitting: boolean;
  error?: unknown;
  onSubmit: (input: ExpenseCreate) => void;
};

// Sentinel for the "Common" option (an expense attributed to nobody in
// particular — split across members in the stats). Distinct from a
// member's user id.
const COMMON = "__common__";

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function ExpenseForm({
  tripId,
  initialValue,
  submitting,
  error,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const { data: categories = [] } = useCategories();
  const { data: members = [] } = useMembers(tripId);
  const { data: currentUser } = useCurrentUser();

  const [name, setName] = useState(initialValue?.name ?? "");
  const [amount, setAmount] = useState(
    initialValue ? (initialValue.amount_cents / 100).toFixed(2) : "",
  );
  const [categoryCode, setCategoryCode] = useState(
    initialValue?.category_code ?? "",
  );
  const [date, setDate] = useState(initialValue?.expense_date ?? todayIso());
  const [description, setDescription] = useState(
    initialValue?.description ?? "",
  );
  // `undefined` = the user hasn't touched the selector yet. For a new
  // expense we then default to the current user; for edit we honor the
  // stored value (null → Common). Either way the selection is one of a
  // member's user id or COMMON.
  const [paidBy, setPaidBy] = useState<string | undefined>(() => {
    if (!initialValue) return undefined;
    return initialValue.paid_by_user_id ?? COMMON;
  });
  const effectivePaidBy =
    paidBy ?? (currentUser ? currentUser.id : COMMON);

  const amountCents = parseEurosToCents(amount);
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const canSubmit =
    name.trim().length > 0 &&
    amountCents !== null &&
    amountCents > 0 &&
    categoryCode.length > 0 &&
    dateValid &&
    !submitting;

  function handleSubmit() {
    if (!canSubmit || amountCents === null) return;
    const trimmedDescription = description.trim();
    onSubmit({
      name: name.trim(),
      amount_cents: amountCents,
      category_code: categoryCode,
      expense_date: date,
      description:
        trimmedDescription.length > 0 ? trimmedDescription : null,
      paid_by_user_id: effectivePaidBy === COMMON ? null : effectivePaidBy,
    });
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4 gap-4"
      keyboardShouldPersistTaps="handled"
    >
      <Input
        label={t("common.name")}
        value={name}
        onChangeText={setName}
        placeholder={t("expenses.namePlaceholder")}
        autoFocus={!initialValue}
        editable={!submitting}
      />

      <Input
        label={t("expenses.amount")}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
        editable={!submitting}
      />

      <View className="gap-2">
        <Text className="text-sm text-ink-secondary font-medium">
          {t("expenses.category")}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {categories.map((c) => (
            <Pill
              key={c.code}
              label={categoryLabel(c.code, c.label)}
              active={c.code === categoryCode}
              onPress={() => setCategoryCode(c.code)}
              disabled={submitting}
            />
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm text-ink-secondary font-medium">
          {t("expenses.paidBy")}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <Pill
            label={t("expenses.common")}
            active={effectivePaidBy === COMMON}
            onPress={() => setPaidBy(COMMON)}
            disabled={submitting}
          />
          {members.map((m) => (
            <Pill
              key={m.user_id}
              label={
                currentUser && m.user_id === currentUser.id
                  ? t("common.nameYou", { name: m.display_name })
                  : m.display_name
              }
              active={effectivePaidBy === m.user_id}
              onPress={() => setPaidBy(m.user_id)}
              disabled={submitting}
            />
          ))}
        </View>
      </View>

      <DateInput
        label={t("expenses.date")}
        value={date}
        onChange={setDate}
        editable={!submitting}
      />

      <Input
        label={t("expenses.descriptionOptional")}
        value={description}
        onChangeText={setDescription}
        placeholder={t("expenses.descriptionPlaceholder")}
        editable={!submitting}
      />

      {error ? (
        <Text className="text-sm text-danger-500">
          {t("common.saveError", {
            error: String((error as Error).message ?? error),
          })}
        </Text>
      ) : null}

      <Button
        size="lg"
        onPress={handleSubmit}
        disabled={!canSubmit}
        isLoading={submitting}
        className="mt-2"
      >
        {t("common.save")}
      </Button>
    </ScrollView>
  );
}
