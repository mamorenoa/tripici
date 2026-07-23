import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { DateInput } from "../../components/DateInput";
import { Input } from "../../components/Input";
import type { Trip } from "../../domain/trips/types";

export type TripFormValues = {
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type Props = {
  /** When provided, the form pre-fills with the trip's values (edit mode). */
  initialValue?: Trip;
  submitting: boolean;
  error?: unknown;
  /** Label for the submit button (e.g. "Create" vs "Save"). */
  submitLabel: string;
  onSubmit: (values: TripFormValues) => void;
  /** Rendered inside the scroll view, below the submit button. Used by
   * the edit screen for its danger zone; empty when creating. */
  footer?: ReactNode;
};

/** Optional date field with a Clear affordance (native pickers can't
 * clear a value on their own). Mirrors the pattern used in PlanForm. */
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
  const { t } = useTranslation();
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
          <Text className="text-xs text-ink-muted">{t("common.clear")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function TripForm({
  initialValue,
  submitting,
  error,
  submitLabel,
  onSubmit,
  footer,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValue?.name ?? "");
  const [startDate, setStartDate] = useState(initialValue?.start_date ?? "");
  const [endDate, setEndDate] = useState(initialValue?.end_date ?? "");

  // Both dates are optional, but when both are set the range must be valid.
  const rangeInvalid =
    startDate.length > 0 && endDate.length > 0 && endDate < startDate;
  const canSubmit = name.trim().length > 0 && !rangeInvalid && !submitting;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
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
        autoFocus={!initialValue}
        placeholder={t("trips.namePlaceholder")}
        editable={!submitting}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <OptionalDate
            label={t("trips.startDateOptional")}
            value={startDate}
            onChange={setStartDate}
            editable={!submitting}
          />
        </View>
        <View className="flex-1">
          <OptionalDate
            label={t("trips.endDateOptional")}
            value={endDate}
            onChange={setEndDate}
            editable={!submitting}
          />
        </View>
      </View>

      {rangeInvalid ? (
        <Text className="text-sm text-danger-500">
          {t("trips.dateRangeError")}
        </Text>
      ) : null}

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
        {submitLabel}
      </Button>

      {footer}
    </ScrollView>
  );
}
