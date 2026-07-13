import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useAcceptInvitation } from "../../domain/invitations/useAcceptInvitation";
import { useInvitationPreview } from "../../domain/invitations/useInvitationPreview";

export function AcceptInvitationScreen() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { data: preview, isLoading, isError } = useInvitationPreview(token);
  const acceptMutation = useAcceptInvitation();

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !preview) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6 gap-3">
        <Text className="text-xl font-semibold text-ink-primary text-center">
          {t("invitation.notValidTitle")}
        </Text>
        <Text className="text-sm text-ink-secondary text-center">
          {t("invitation.notValidDescription")}
        </Text>
        <Button
          variant="secondary"
          className="mt-2"
          onPress={() => router.replace("/")}
        >
          {t("invitation.goToTrips")}
        </Button>
      </View>
    );
  }

  async function handleAccept() {
    try {
      const trip = await acceptMutation.mutateAsync(token);
      router.replace(`/trips/${trip.id}`);
    } catch {
      // Surfaced inline below.
    }
  }

  return (
    <View className="flex-1 bg-background items-center justify-center px-4">
      <Card className="w-full max-w-md gap-3 items-center">
        <Text className="text-sm text-ink-secondary text-center">
          <Text className="font-semibold text-ink-primary">
            {preview.inviter_display_name}
          </Text>{" "}
          {t("invitation.invitedYou")}
        </Text>
        <Text className="text-3xl font-bold text-brand-600 text-center">
          {preview.trip_name}
        </Text>

        {acceptMutation.isError ? (
          <Text className="text-sm text-danger-500 text-center">
            {t("invitation.joinError")}
          </Text>
        ) : null}

        <Button
          size="lg"
          className="self-stretch mt-3"
          onPress={handleAccept}
          isLoading={acceptMutation.isPending}
        >
          {t("invitation.joinTrip")}
        </Button>
      </Card>
    </View>
  );
}
