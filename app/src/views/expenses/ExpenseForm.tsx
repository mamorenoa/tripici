import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { DateInput } from "../../components/DateInput";
import { Input } from "../../components/Input";
import { Pill } from "../../components/Pill";
import { useCategories } from "../../domain/categories/useCategories";
import type { Expense, ExpenseCreate } from "../../domain/expenses/types";
import { parseEurosToCents } from "../../lib/money";

type Props = {
  /** When provided, the form acts as "edit" with pre-filled values. */
  initialValue?: Expense;
  submitting: boolean;
  error?: unknown;
  onSubmit: (input: ExpenseCreate) => void;
};

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function ExpenseForm({
  initialValue,
  submitting,
  error,
  onSubmit,
}: Props) {
  const { data: categories = [] } = useCategories();

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

  const amountCents = parseEurosToCents(amount);
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const canSubmit =
    amountCents !== null &&
    amountCents > 0 &&
    categoryCode.length > 0 &&
    dateValid &&
    !submitting;

  function handleSubmit() {
    if (!canSubmit || amountCents === null) return;
    const trimmedDescription = description.trim();
    onSubmit({
      amount_cents: amountCents,
      category_code: categoryCode,
      expense_date: date,
      description:
        trimmedDescription.length > 0 ? trimmedDescription : null,
    });
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4 gap-4"
      keyboardShouldPersistTaps="handled"
    >
      <Input
        label="Amount (EUR)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
        editable={!submitting}
      />

      <View className="gap-2">
        <Text className="text-sm text-ink-secondary font-medium">Category</Text>
        <View className="flex-row flex-wrap gap-2">
          {categories.map((c) => (
            <Pill
              key={c.code}
              label={c.label}
              active={c.code === categoryCode}
              onPress={() => setCategoryCode(c.code)}
              disabled={submitting}
            />
          ))}
        </View>
      </View>

      <DateInput
        label="Date"
        value={date}
        onChange={setDate}
        editable={!submitting}
      />

      <Input
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. Pizza"
        editable={!submitting}
      />

      {error ? (
        <Text className="text-sm text-danger-500">
          Could not save: {String((error as Error).message ?? error)}
        </Text>
      ) : null}

      <Button
        size="lg"
        onPress={handleSubmit}
        disabled={!canSubmit}
        isLoading={submitting}
        className="mt-2"
      >
        Save
      </Button>
    </ScrollView>
  );
}
