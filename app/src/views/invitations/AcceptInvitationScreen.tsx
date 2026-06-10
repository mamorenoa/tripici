import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAcceptInvitation } from "../../domain/invitations/useAcceptInvitation";
import { useInvitationPreview } from "../../domain/invitations/useInvitationPreview";

export function AcceptInvitationScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { data: preview, isLoading, isError } = useInvitationPreview(token);
  const acceptMutation = useAcceptInvitation();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !preview) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Invitation not valid</Text>
        <Text style={styles.body}>
          The link has expired or been revoked by the trip owner.
        </Text>
        <Pressable onPress={() => router.replace("/")} style={styles.button}>
          <Text style={styles.buttonText}>Go to my trips</Text>
        </Pressable>
      </View>
    );
  }

  async function handleAccept() {
    try {
      const trip = await acceptMutation.mutateAsync(token);
      router.replace(`/trips/${trip.id}`);
    } catch {
      // Surfaced below via mutation.isError.
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.body}>
        <Text style={styles.bold}>{preview.inviter_display_name}</Text>{" "}
        invited you to join
      </Text>
      <Text style={styles.tripName}>{preview.trip_name}</Text>

      {acceptMutation.isError ? (
        <Text style={styles.error}>Could not join. Try again.</Text>
      ) : null}

      <Pressable
        onPress={handleAccept}
        disabled={acceptMutation.isPending}
        style={[
          styles.button,
          acceptMutation.isPending && styles.buttonDisabled,
        ]}
      >
        {acceptMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Join trip</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: "600", textAlign: "center" },
  body: { fontSize: 16, textAlign: "center" },
  bold: { fontWeight: "700" },
  tripName: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    color: "#0a6b2e",
  },
  error: { color: "#b00020", textAlign: "center" },
  button: {
    backgroundColor: "#0a6b2e",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
