import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { DateInput } from "../../components/DateInput";
import { Input } from "../../components/Input";
import { useCreateTrip } from "../../domain/trips/useCreateTrip";

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

export function CreateTripScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const mutation = useCreateTrip();

  // Both dates are optional, but when both are set the range must be valid.
  const rangeInvalid =
    startDate.length > 0 && endDate.length > 0 && endDate < startDate;
  const canSubmit =
    name.trim().length > 0 && !rangeInvalid && !mutation.isPending;

  async function onSubmit() {
    if (!canSubmit) return;
    try {
      await mutation.mutateAsync({
        name: name.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
      });
      router.back();
    } catch {
      // Error is surfaced below via `mutation.error`.
    }
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
        autoFocus
        placeholder={t("trips.namePlaceholder")}
        editable={!mutation.isPending}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <OptionalDate
            label={t("trips.startDateOptional")}
            value={startDate}
            onChange={setStartDate}
            editable={!mutation.isPending}
          />
        </View>
        <View className="flex-1">
          <OptionalDate
            label={t("trips.endDateOptional")}
            value={endDate}
            onChange={setEndDate}
            editable={!mutation.isPending}
          />
        </View>
      </View>

      {rangeInvalid ? (
        <Text className="text-sm text-danger-500">
          {t("trips.dateRangeError")}
        </Text>
      ) : null}

      {mutation.isError ? (
        <Text className="text-sm text-danger-500">
          {t("trips.createError", {
            error: String(mutation.error.message ?? mutation.error),
          })}
        </Text>
      ) : null}

      <Button
        size="lg"
        onPress={onSubmit}
        disabled={!canSubmit}
        isLoading={mutation.isPending}
        className="mt-2"
      >
        {t("common.create")}
      </Button>
    </ScrollView>
  );
}
