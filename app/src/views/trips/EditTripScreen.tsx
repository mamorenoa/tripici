import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Platform, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { useCurrentUser } from "../../domain/auth/useCurrentUser";
import { useExpenses } from "../../domain/expenses/useExpenses";
import { usePlans } from "../../domain/plans/usePlans";
import { useDeleteTrip } from "../../domain/trips/useDeleteTrip";
import { useTrip } from "../../domain/trips/useTrip";
import { useUpdateTrip } from "../../domain/trips/useUpdateTrip";
import { TripForm, type TripFormValues } from "./TripForm";

export function EditTripScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: trip, isLoading } = useTrip(tripId);
  const { data: currentUser } = useCurrentUser();
  const mutation = useUpdateTrip(tripId);

  // Counts for the confirmation dialog. Both are already cached: this
  // screen is only reachable from the trip detail, which loads them.
  const { data: expenses = [] } = useExpenses(tripId);
  const { data: plans = [] } = usePlans(tripId);
  const deleteMutation = useDeleteTrip(tripId);

  if (isLoading || !trip) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  async function handleSubmit(values: TripFormValues) {
    try {
      await mutation.mutateAsync(values);
      router.back();
    } catch {
      // Error surfaced inside TripForm via the `error` prop.
    }
  }

  async function performDelete() {
    try {
      await deleteMutation.mutateAsync();
      // Never router.back(): that would land on the detail screen of a
      // trip that no longer exists.
      router.replace("/");
    } catch {
      // Error surfaced in the danger zone below.
    }
  }

  function confirmDelete() {
    const message = t("trips.deleteConfirm", {
      name: trip?.name ?? "",
      expenses: t("trips.deleteCountExpenses", { count: expenses.length }),
      plans: t("trips.deleteCountPlans", { count: plans.length }),
    });

    if (Platform.OS === "web") {
      if (globalThis.window?.confirm(message)) {
        void performDelete();
      }
    } else {
      Alert.alert(t("trips.deleteTitle"), message, [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("trips.deleteAction"),
          style: "destructive",
          onPress: () => void performDelete(),
        },
      ]);
    }
  }

  // The header pencil is owner-only, but this route can also be reached
  // by a direct link — don't offer a delete the backend would reject.
  const isOwner = !!currentUser && currentUser.id === trip.owner_id;

  return (
    <TripForm
      initialValue={trip}
      submitting={mutation.isPending}
      error={mutation.error ?? undefined}
      submitLabel={t("common.save")}
      onSubmit={handleSubmit}
      footer={
        !isOwner ? null : (
          <View className="mt-8 pt-4 border-t border-border gap-2">
            <Text className="text-xs uppercase tracking-wide text-ink-muted">
              {t("trips.dangerZone")}
            </Text>
            <Button
              variant="danger"
              onPress={confirmDelete}
              isLoading={deleteMutation.isPending}
              disabled={deleteMutation.isPending}
            >
              {t("trips.deleteAction")}
            </Button>
            {deleteMutation.error ? (
              <Text className="text-sm text-danger-500">
                {t("trips.deleteError", {
                  error: String(
                    (deleteMutation.error as Error).message ??
                      deleteMutation.error,
                  ),
                })}
              </Text>
            ) : null}
          </View>
        )
      }
    />
  );
}
