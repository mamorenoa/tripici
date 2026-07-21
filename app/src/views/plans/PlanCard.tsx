import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import type { Plan } from "../../domain/plans/types";
import { formatEuros } from "../../lib/money";
import { colors } from "../../lib/theme";
import { planColor, planIsPast, planMeta, todayIso } from "./planUtils";

export function PlanCard({ plan, tripId }: { plan: Plan; tripId: string }) {
  const { t } = useTranslation();
  const meta = planMeta(plan);
  const past = planIsPast(plan, todayIso());

  return (
    <Link href={`/trips/${tripId}/plans/${plan.id}`} asChild>
      <Pressable>
        <Card
          className={`flex-row gap-3 border border-border ${past ? "opacity-60" : ""}`}
        >
          {/* Left accent bar, coloured per plan. */}
          <View
            className="w-1 rounded-full self-stretch"
            style={{ backgroundColor: planColor(plan) }}
          />
          <View className="flex-1 gap-1">
            <View className="flex-row items-start justify-between gap-2">
              <Text
                className={`text-base font-semibold text-ink-primary flex-1 ${
                  past ? "line-through" : ""
                }`}
                numberOfLines={1}
              >
                {plan.name}
              </Text>
              {plan.cost_cents != null ? (
                <Text className="text-base font-semibold text-ink-primary">
                  {formatEuros(plan.cost_cents)}
                </Text>
              ) : null}
            </View>

            {plan.description ? (
              <Text className="text-sm text-ink-secondary" numberOfLines={2}>
                {plan.description}
              </Text>
            ) : null}

            <View className="flex-row items-center gap-3 flex-wrap mt-1">
              {meta ? (
                <Text className="text-xs text-ink-muted">{meta}</Text>
              ) : null}
              {plan.location ? (
                <View className="flex-row items-center gap-1 flex-shrink">
                  <Icon name="map-pin" size={12} color={colors.ink.muted} />
                  <Text
                    className="text-xs text-ink-muted flex-shrink"
                    numberOfLines={1}
                  >
                    {plan.location}
                  </Text>
                </View>
              ) : null}
              {past ? (
                <View className="flex-row items-center gap-1">
                  <Icon name="check" size={12} color={colors.brand[600]} />
                  <Text className="text-xs text-brand-600">
                    {t("plans.past")}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}
