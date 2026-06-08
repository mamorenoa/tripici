import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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
  // Local timezone, formatted YYYY-MM-DD.
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
  const { data: categories = [], isLoading: catsLoading } = useCategories();

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
      description: trimmedDescription.length > 0 ? trimmedDescription : null,
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Amount (EUR)</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
        style={styles.input}
        editable={!submitting}
      />

      <Text style={styles.label}>Category</Text>
      {catsLoading ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.pillRow}>
          {categories.map((c) => {
            const active = c.code === categoryCode;
            return (
              <Pressable
                key={c.code}
                onPress={() => setCategoryCode(c.code)}
                disabled={submitting}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={active ? styles.pillTextActive : styles.pillText}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        style={[
          styles.input,
          date.length > 0 && !dateValid && styles.inputError,
        ]}
        editable={!submitting}
      />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. Pizza"
        style={styles.input}
        editable={!submitting}
      />

      {error ? (
        <Text style={styles.error}>
          Could not save: {String((error as Error).message ?? error)}
        </Text>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 4, paddingBottom: 32 },
  label: { fontSize: 14, color: "#444", marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: { borderColor: "#b00020" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#eee",
  },
  pillActive: { backgroundColor: "#0a6b2e" },
  pillText: { color: "#333" },
  pillTextActive: { color: "#fff", fontWeight: "600" },
  button: {
    backgroundColor: "#0a6b2e",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#b00020", fontSize: 14, marginTop: 12 },
});
