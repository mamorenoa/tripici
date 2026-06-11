import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Text,
  View,
} from "react-native";

import { Avatar } from "../../components/Avatar";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
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

  const isOwner =
    !!currentUser && !!trip && currentUser.id === trip.owner_id;

  const { data: invitations = [], isLoading: invitesLoading } = useInvitations(
    tripId,
    isOwner,
  );
  const createMutation = useCreateInvitation(tripId);
  const revokeMutation = useRevokeInvitation(tripId);

  const activeInvite = invitations[0];
  const activeUrl = activeInvite ? buildInviteUrl(activeInvite.token) : null;

  async function copyToClipboard(url: string) {
    await Clipboard.setStringAsync(url);
    if (Platform.OS === "web" && globalThis.window) {
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
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: trip?.name ?? "Members" }} />

      <FlatList
        ListHeaderComponent={
          <Text className="text-xs uppercase tracking-wide text-ink-muted mb-2 mt-4 px-4">
            Members
          </Text>
        }
        data={members}
        keyExtractor={(m, i) => m.user_id ?? String(i)}
        contentContainerClassName="pb-6"
        ListEmptyComponent={
          membersLoading ? (
            <View className="py-10 items-center">
              <ActivityIndicator />
            </View>
          ) : null
        }
        renderItem={({ item }: { item: TripMember }) => (
          <View className="px-4 pb-2">
            <Card className="flex-row items-center gap-3">
              <Avatar name={item.display_name} />
              <View className="flex-1">
                <Text className="text-base font-semibold text-ink-primary">
                  {item.display_name}
                </Text>
                <Text className="text-xs text-ink-muted">{item.email}</Text>
              </View>
              {item.is_owner ? <Badge variant="brand">Owner</Badge> : null}
            </Card>
          </View>
        )}
        ListFooterComponent={
          isOwner ? (
            <View className="px-4 mt-4 gap-3">
              <Text className="text-xs uppercase tracking-wide text-ink-muted">
                Invite link
              </Text>
              <Card className="gap-3">
                {invitesLoading ? (
                  <ActivityIndicator />
                ) : activeInvite && activeUrl ? (
                  <>
                    <Text
                      className="text-sm text-ink-secondary"
                      numberOfLines={1}
                      style={{ fontFamily: "monospace" }}
                    >
                      {activeUrl}
                    </Text>
                    <Text className="text-xs text-ink-muted">
                      Expires{" "}
                      {new Date(activeInvite.expires_at).toLocaleDateString()}
                    </Text>
                    <View className="flex-row gap-2">
                      <Button
                        size="sm"
                        onPress={() => copyToClipboard(activeUrl)}
                      >
                        Copy link
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onPress={revokeLink}
                        disabled={revokeMutation.isPending}
                      >
                        Revoke
                      </Button>
                    </View>
                  </>
                ) : (
                  <EmptyState
                    title="No active invite link"
                    description="Generate one to share with someone."
                  />
                )}
                <Button
                  size="lg"
                  onPress={generateLink}
                  disabled={
                    createMutation.isPending || revokeMutation.isPending
                  }
                  isLoading={createMutation.isPending}
                >
                  {activeInvite ? "Generate new link" : "Generate invite link"}
                </Button>
              </Card>
            </View>
          ) : null
        }
      />
    </View>
  );
}
