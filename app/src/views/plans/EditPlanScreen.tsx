import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import type { PlanCreate } from "../../domain/plans/types";
import {
  useDeletePlan,
  usePlans,
  useUpdatePlan,
} from "../../domain/plans/usePlans";
import { PlanForm } from "./PlanForm";

export function EditPlanScreen() {
  const { id: tripId, planId } = useLocalSearchParams<{
    id: string;
    planId: string;
  }>();
  const router = useRouter();
  const { data: plans, isLoading } = usePlans(tripId);
  const updateMutation = useUpdatePlan(tripId);
  const deleteMutation = useDeletePlan(tripId);

  const plan = plans?.find((p) => p.id === planId);

  if (isLoading || !plan) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  async function handleSave(input: PlanCreate) {
    try {
      await updateMutation.mutateAsync({ id: planId, patch: input });
      router.back();
    } catch {
      // Surfaced inside PlanForm via the `error` prop.
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(planId);
      router.back();
    } catch {
      // Best-effort.
    }
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1">
        <PlanForm
          initialValue={plan}
          submitting={updateMutation.isPending}
          error={updateMutation.error ?? undefined}
          onSubmit={handleSave}
        />
      </View>
      <View className="px-4 py-3 border-t border-border bg-surface">
        <Button
          variant="danger"
          onPress={handleDelete}
          isLoading={deleteMutation.isPending}
        >
          <Icon name="trash-2" size={18} color="#e11d48" />
        </Button>
      </View>
    </View>
  );
}
