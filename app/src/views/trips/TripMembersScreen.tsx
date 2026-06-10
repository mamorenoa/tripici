import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useCurrentUser } from "../../domain/auth/useCurrentUser";
import { useCreateInvitation } from "../../domain/invitations/useCreateInvitation";
import { useInvitations } from "../../domain/invitations/useInvitations";
import { useRevokeInvitation } from "../../domain/invitations/useRevokeInvitation";
import { useMembers } from "../../domain/members/useMembers";
import type { TripMember } from "../../domain/members/types";
import { useTrip } from "../../domain/trips/useTrip";
import { buildInviteUrl } from "../../lib/inviteLink";

export function TripMembersScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: currentUser } = useCurrentUser();
  const { data: trip } = useTrip(tripId);
  const { data: members = [], isLoading: membersLoading } = useMembers(tripId);

  const isOwner = !!currentUser && !!trip && currentUser.id === trip.owner_id;
  const { data: invitations = [], isLoading: invitesLoading } = useInvitations(
    tripId,
    isOwner,
  );
  const createMutation = useCreateInvitation(tripId);
  const revokeMutation = useRevokeInvitation(tripId);

  // The plan UX shows a single active link at a time: generating
  // revokes the previous, revoking just clears it.
  const activeInvite = invitations[0];
  const activeUrl = activeInvite ? buildInviteUrl(activeInvite.token) : null;

  async function copyToClipboard(url: string) {
    await Clipboard.setStringAsync(url);
    if (Platform.OS === "web" && globalThis.window) {
      // Lightweight feedback on web — Alert.alert is unreliable in RN-Web.
      globalThis.window.alert("Invite link copied to clipboard.");
    }
  }

  async function generateLink() {
    if (activeInvite) {
      await revokeMutation.mutateAsync(activeInvite.id);
    }
    const created = await createMutation.mutateAsync();
    await copyToClipboard(buildInviteUrl(created.token));
  }

  async function revokeLink() {
    if (activeInvite) {
      await revokeMutation.mutateAsync(activeInvite.id);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: trip?.name ?? "Members" }} />

      <Text style={styles.section}>Members</Text>
      {membersLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m, i) => m.user_id ?? String(i)}
          renderItem={({ item }: { item: TripMember }) => (
            <View style={styles.memberRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{item.display_name}</Text>
                <Text style={styles.memberEmail}>{item.email}</Text>
              </View>
              {item.is_owner ? (
                <Text style={styles.ownerBadge}>Owner</Text>
              ) : null}
            </View>
          )}
          scrollEnabled={false}
        />
      )}

      {isOwner ? (
        <View style={styles.inviteSection}>
          <Text style={styles.section}>Invite link</Text>
          {invitesLoading ? (
            <ActivityIndicator />
          ) : activeInvite && activeUrl ? (
            <>
              <Text style={styles.link} numberOfLines={1}>
                {activeUrl}
              </Text>
              <Text style={styles.linkMeta}>
                Expires{" "}
                {new Date(activeInvite.expires_at).toLocaleDateString()}
              </Text>
              <View style={styles.buttonRow}>
                <Pressable
                  onPress={() => copyToClipboard(activeUrl)}
                  style={styles.buttonPrimary}
                >
                  <Text style={styles.buttonText}>Copy link</Text>
                </Pressable>
                <Pressable
                  onPress={revokeLink}
                  disabled={revokeMutation.isPending}
                  style={styles.buttonSecondary}
                >
                  <Text style={styles.buttonSecondaryText}>Revoke</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Text style={styles.empty}>No active invite link.</Text>
          )}
          <Pressable
            onPress={generateLink}
            disabled={
              createMutation.isPending || revokeMutation.isPending
            }
            style={[
              styles.buttonPrimary,
              styles.buttonStretched,
              (createMutation.isPending || revokeMutation.isPending) &&
                styles.buttonDisabled,
            ]}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {activeInvite ? "Generate new link" : "Generate invite link"}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  section: { fontSize: 18, fontWeight: "600", marginTop: 8 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
    gap: 8,
  },
  memberName: { fontSize: 16 },
  memberEmail: { fontSize: 12, color: "#666" },
  ownerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#0a6b2e",
    color: "#fff",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
  },
  inviteSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f6f6f6",
    borderRadius: 8,
    gap: 8,
  },
  link: { fontFamily: "monospace", fontSize: 13 },
  linkMeta: { fontSize: 12, color: "#666" },
  buttonRow: { flexDirection: "row", gap: 8 },
  buttonPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#0a6b2e",
  },
  buttonStretched: { marginTop: 12, paddingVertical: 14 },
  buttonSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#b00020",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600" },
  buttonSecondaryText: { color: "#b00020", fontWeight: "600" },
  empty: { color: "#666" },
});
