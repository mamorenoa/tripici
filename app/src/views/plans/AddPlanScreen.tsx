import { useLocalSearchParams, useRouter } from "expo-router";

import type { PlanCreate } from "../../domain/plans/types";
import { useCreatePlan } from "../../domain/plans/usePlans";
import { PlanForm } from "./PlanForm";

export function AddPlanScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mutation = useCreatePlan(tripId);

  async function handleSubmit(input: PlanCreate) {
    try {
      await mutation.mutateAsync(input);
      router.back();
    } catch {
      // Error rendered inside the form via ``mutation.error``.
    }
  }

  return (
    <PlanForm
      submitting={mutation.isPending}
      error={mutation.error ?? undefined}
      onSubmit={handleSubmit}
    />
  );
}
