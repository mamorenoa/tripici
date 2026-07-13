import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import type { Plan } from "../../domain/plans/types";
import { formatEuros } from "../../lib/money";
import { planColor, planIsPast, planMeta, todayIso } from "./planUtils";

export function PlanCard({ plan, tripId }: { plan: Plan; tripId: string }) {
  const { t } = useTranslation();
  const meta = planMeta(plan);
  const past = planIsPast(plan, todayIso());

  return (
    <Link href={`/trips/${tripId}/plans/${plan.id}`} asChild>
      <Pressable>
        <Card
          className={`flex-row items-start gap-3 ${past ? "opacity-60" : ""}`}
        >
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <View
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: planColor(plan) }}
              />
              <Text
                className="text-base font-semibold text-ink-primary flex-shrink"
                numberOfLines={1}
              >
                {plan.name}
              </Text>
              {past ? <Badge variant="neutral">{t("plans.past")}</Badge> : null}
            </View>
            <Text
              className="text-sm text-ink-secondary mt-0.5"
              numberOfLines={2}
            >
              {plan.description}
            </Text>
            {meta ? (
              <Text className="text-xs text-ink-muted mt-1">{meta}</Text>
            ) : null}
            {plan.location ? (
              <Text
                className="text-xs text-ink-muted mt-0.5"
                numberOfLines={1}
              >
                📍 {plan.location}
              </Text>
            ) : null}
          </View>
          {plan.cost_cents != null ? (
            <Text className="text-base font-semibold text-ink-primary">
              {formatEuros(plan.cost_cents)}
            </Text>
          ) : null}
        </Card>
      </Pressable>
    </Link>
  );
}
