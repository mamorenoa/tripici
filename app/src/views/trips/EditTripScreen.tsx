import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";

import { useTrip } from "../../domain/trips/useTrip";
import { useUpdateTrip } from "../../domain/trips/useUpdateTrip";
import { TripForm, type TripFormValues } from "./TripForm";

export function EditTripScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: trip, isLoading } = useTrip(tripId);
  const mutation = useUpdateTrip(tripId);

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

  return (
    <TripForm
      initialValue={trip}
      submitting={mutation.isPending}
      error={mutation.error ?? undefined}
      submitLabel={t("common.save")}
      onSubmit={handleSubmit}
    />
  );
}
