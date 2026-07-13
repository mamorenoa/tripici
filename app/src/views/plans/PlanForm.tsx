import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { DateInput } from "../../components/DateInput";
import { Icon } from "../../components/Icon";
import { Input } from "../../components/Input";
import { Pill } from "../../components/Pill";
import { TimeInput } from "../../components/TimeInput";
import { useCategories } from "../../domain/categories/useCategories";
import { useCategoryLabel } from "../../domain/categories/useCategoryLabel";
import type { Plan, PlanCreate } from "../../domain/plans/types";
import { openInMaps } from "../../lib/maps";
import { parseEurosToCents } from "../../lib/money";
import { PlanLinks } from "./PlanLinks";

const DEFAULT_EXPENSE_CATEGORY = "ACTIVITIES";

type Props = {
  /** The trip this plan belongs to — needed to manage documentation links. */
  tripId: string;
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

export function PlanForm({
  tripId,
  initialValue,
  submitting,
  error,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const { data: categories = [] } = useCategories();

  const [name, setName] = useState(initialValue?.name ?? "");
  const [description, setDescription] = useState(
    initialValue?.description ?? "",
  );
  const [startDate, setStartDate] = useState(initialValue?.start_date ?? "");
  // API sends "HH:MM:SS"; the input works in "HH:MM".
  const [startTime, setStartTime] = useState(
    initialValue?.start_time?.slice(0, 5) ?? "",
  );
  const [endDate, setEndDate] = useState(initialValue?.end_date ?? "");
  const [duration, setDuration] = useState(initialValue?.duration ?? "");
  const [location, setLocation] = useState(initialValue?.location ?? "");
  const [cost, setCost] = useState(
    initialValue?.cost_cents != null
      ? (initialValue.cost_cents / 100).toFixed(2)
      : "",
  );
  const [countAsExpense, setCountAsExpense] = useState(
    initialValue?.count_as_expense ?? false,
  );
  const [expenseCategory, setExpenseCategory] = useState(
    initialValue?.expense_category_code ?? DEFAULT_EXPENSE_CATEGORY,
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
      start_time: startTime || null,
      end_date: endDate || null,
      duration: duration.trim() ? duration.trim() : null,
      location: location.trim() ? location.trim() : null,
      cost_cents: costTrimmed ? costCents : null,
      count_as_expense: countAsExpense,
      expense_category_code: countAsExpense ? expenseCategory : null,
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
        placeholder={t("plans.namePlaceholder")}
        editable={!submitting}
      />

      <Input
        label={t("plans.description")}
        value={description}
        onChangeText={setDescription}
        placeholder={t("plans.descriptionPlaceholder")}
        editable={!submitting}
        multiline
        numberOfLines={3}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <OptionalDate
            label={t("plans.startOptional")}
            value={startDate}
            onChange={setStartDate}
            editable={!submitting}
          />
        </View>
        <View className="flex-1">
          <OptionalDate
            label={t("plans.endOptional")}
            value={endDate}
            onChange={setEndDate}
            editable={!submitting}
          />
        </View>
      </View>

      <View className="gap-1">
        <TimeInput
          label={t("plans.startTimeOptional")}
          value={startTime}
          onChange={setStartTime}
          editable={!submitting}
        />
        {startTime ? (
          <Pressable onPress={() => setStartTime("")} disabled={submitting}>
            <Text className="text-xs text-ink-muted">{t("common.clear")}</Text>
          </Pressable>
        ) : null}
      </View>

      <Input
        label={t("plans.durationOptional")}
        value={duration}
        onChangeText={setDuration}
        placeholder={t("plans.durationPlaceholder")}
        editable={!submitting}
      />

      <View className="gap-2">
        <Input
          label={t("plans.locationOptional")}
          value={location}
          onChangeText={setLocation}
          placeholder={t("plans.locationPlaceholder")}
          autoCapitalize="none"
          editable={!submitting}
        />
        {location.trim() ? (
          <Button
            size="sm"
            variant="secondary"
            onPress={() => openInMaps(location)}
          >
            <View className="flex-row items-center gap-1.5">
              <Icon name="map-pin" size={16} color="#059669" />
              <Text className="text-brand-700 font-semibold">
                {t("plans.openInMaps")}
              </Text>
            </View>
          </Button>
        ) : null}
      </View>

      <Input
        label={t("plans.costOptional")}
        value={cost}
        onChangeText={setCost}
        keyboardType="decimal-pad"
        placeholder="0.00"
        editable={!submitting}
      />

      {/* Count the plan's cost as a trip expense */}
      <View className="gap-2">
        <Pressable
          onPress={() => setCountAsExpense((v) => !v)}
          disabled={submitting}
          className="flex-row items-center gap-2"
        >
          <View
            className={`w-5 h-5 rounded border items-center justify-center ${
              countAsExpense
                ? "bg-brand-600 border-brand-600"
                : "border-border bg-surface"
            }`}
          >
            {countAsExpense ? (
              <Icon name="check" size={14} color="#ffffff" />
            ) : null}
          </View>
          <Text className="text-sm text-ink-primary">
            {t("plans.countAsExpense")}
          </Text>
        </Pressable>

        {countAsExpense ? (
          <View className="gap-2 pl-7">
            <Text className="text-xs text-ink-muted">
              {t("plans.countAsExpenseHint")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {categories.map((c) => (
                <Pill
                  key={c.code}
                  label={categoryLabel(c.code, c.label)}
                  active={c.code === expenseCategory}
                  onPress={() => setExpenseCategory(c.code)}
                  disabled={submitting}
                />
              ))}
            </View>
            {costTrimmed === "" ? (
              <Text className="text-xs text-danger-500">
                {t("plans.addCostHint")}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

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

      {/* Documentation links — only once the plan exists (needs its id). */}
      {initialValue ? (
        <View className="mt-2 pt-4 border-t border-border">
          <PlanLinks tripId={tripId} plan={initialValue} />
        </View>
      ) : (
        <Text className="text-xs text-ink-muted text-center">
          {t("plans.saveFirstForLinks")}
        </Text>
      )}
    </ScrollView>
  );
}
