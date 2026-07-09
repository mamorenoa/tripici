import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { DateInput } from "../../components/DateInput";
import { Input } from "../../components/Input";
import type { Plan, PlanCreate } from "../../domain/plans/types";
import { parseEurosToCents } from "../../lib/money";

type Props = {
  /** When provided, the form acts as "edit" with pre-filled values. */
  initialValue?: Plan;
  submitting: boolean;
  error?: unknown;
  onSubmit: (input: PlanCreate) => void;
};

/** An optional date field: the DateInput plus a Clear affordance so the
 * value can be unset on every platform (native pickers can't clear). */
function OptionalDate({
  label,
  value,
  onChange,
  editable,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
}) {
  return (
    <View className="gap-1">
      <DateInput
        label={label}
        value={value}
        onChange={onChange}
        editable={editable}
      />
      {value ? (
        <Pressable onPress={() => onChange("")} disabled={!editable}>
          <Text className="text-xs text-ink-muted">Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PlanForm({ initialValue, submitting, error, onSubmit }: Props) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [description, setDescription] = useState(
    initialValue?.description ?? "",
  );
  const [startDate, setStartDate] = useState(initialValue?.start_date ?? "");
  const [endDate, setEndDate] = useState(initialValue?.end_date ?? "");
  const [duration, setDuration] = useState(initialValue?.duration ?? "");
  const [cost, setCost] = useState(
    initialValue?.cost_cents != null
      ? (initialValue.cost_cents / 100).toFixed(2)
      : "",
  );

  const costTrimmed = cost.trim();
  const costCents = costTrimmed ? parseEurosToCents(costTrimmed) : null;
  const costValid = costTrimmed === "" || costCents !== null;

  const canSubmit =
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    costValid &&
    !submitting;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
      duration: duration.trim() ? duration.trim() : null,
      cost_cents: costTrimmed ? costCents : null,
    });
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4 gap-4"
      keyboardShouldPersistTaps="handled"
    >
      <Input
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Coliseo"
        editable={!submitting}
      />

      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="What's the plan?"
        editable={!submitting}
        multiline
        numberOfLines={3}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <OptionalDate
            label="Start (optional)"
            value={startDate}
            onChange={setStartDate}
            editable={!submitting}
          />
        </View>
        <View className="flex-1">
          <OptionalDate
            label="End (optional)"
            value={endDate}
            onChange={setEndDate}
            editable={!submitting}
          />
        </View>
      </View>

      <Input
        label="Duration (optional)"
        value={duration}
        onChangeText={setDuration}
        placeholder="e.g. 2h, all day, weekend"
        editable={!submitting}
      />

      <Input
        label="Cost (EUR, optional)"
        value={cost}
        onChangeText={setCost}
        keyboardType="decimal-pad"
        placeholder="0.00"
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
