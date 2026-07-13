import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { useCategoryLabel } from "../../domain/categories/useCategoryLabel";
import { usePlans } from "../../domain/plans/usePlans";
import { openInMaps } from "../../lib/maps";
import { formatEuros } from "../../lib/money";
import { planColor, planIsPast, planMeta, todayIso } from "./planUtils";

function openUrl(url: string) {
  if (Platform.OS === "web") {
    globalThis.window?.open(url, "_blank", "noopener,noreferrer");
  } else {
    Linking.openURL(url).catch(() => {
      // Best-effort: ignore unopenable URLs.
    });
  }
}

export function PlanDetailScreen() {
  const { id: tripId, planId } = useLocalSearchParams<{
    id: string;
    planId: string;
  }>();
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const { data: plans, isLoading } = usePlans(tripId);

  const plan = plans?.find((p) => p.id === planId);

  if (isLoading || !plan) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  const meta = planMeta(plan);
  const past = planIsPast(plan, todayIso());
  const expenseCategoryLabel = plan.expense_category_code
    ? categoryLabel(plan.expense_category_code)
    : null;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: plan.name,
          headerRight: () => (
            <Link href={`/trips/${tripId}/plans/${planId}/edit`} asChild>
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
        <Card className="gap-3">
          <View className="flex-row items-center gap-2">
            <View
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: planColor(plan) }}
            />
            <Text className="text-xl font-semibold text-ink-primary flex-1">
              {plan.name}
            </Text>
            {past ? <Badge variant="neutral">{t("plans.past")}</Badge> : null}
          </View>

          <Text className="text-base text-ink-secondary">
            {plan.description}
          </Text>

          {meta ? <Text className="text-sm text-ink-muted">{meta}</Text> : null}

          {plan.location ? (
            <View className="gap-2">
              <Text className="text-sm text-ink-primary">
                📍 {plan.location}
              </Text>
              <Pressable
                className="self-start flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-50"
                onPress={() => openInMaps(plan.location!)}
              >
                <Icon name="map-pin" size={16} color="#059669" />
                <Text className="text-brand-700 font-semibold">
                  {t("plans.openInMaps")}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {plan.cost_cents != null ? (
            <View className="gap-1">
              <Text className="text-xs text-ink-muted">{t("plans.cost")}</Text>
              <Text className="text-lg font-semibold text-ink-primary">
                {formatEuros(plan.cost_cents)}
              </Text>
              {plan.count_as_expense ? (
                <Text className="text-xs text-ink-muted">
                  {t("plans.countedAsCommon")}
                  {expenseCategoryLabel ? ` · ${expenseCategoryLabel}` : ""}
                </Text>
              ) : null}
            </View>
          ) : null}
        </Card>

        {plan.links && plan.links.length > 0 ? (
          <Card className="gap-2">
            <Text className="text-sm text-ink-secondary font-medium">
              {t("plans.documentation")}
            </Text>
            {plan.links.map((link) => (
              <Pressable key={link.id} onPress={() => openUrl(link.url)}>
                <Text className="text-sm text-brand-600" numberOfLines={1}>
                  🔗 {link.label || link.url}
                </Text>
              </Pressable>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}
