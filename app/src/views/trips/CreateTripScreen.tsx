import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useCreateTrip } from "../../domain/trips/useCreateTrip";
import { TripForm, type TripFormValues } from "./TripForm";

export function CreateTripScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const mutation = useCreateTrip();

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
      submitting={mutation.isPending}
      error={mutation.error ?? undefined}
      submitLabel={t("common.create")}
      onSubmit={handleSubmit}
    />
  );
}
