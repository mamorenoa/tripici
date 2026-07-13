import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
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
import { useMembers, useRemoveMember } from "../../domain/members/useMembers";
import type { TripMember } from "../../domain/members/types";
import { useTrip } from "../../domain/trips/useTrip";
import { activeLocaleTag } from "../../lib/i18n";
import { buildInviteUrl } from "../../lib/inviteLink";

export function TripMembersScreen() {
  const { t } = useTranslation();
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
  const removeMember = useRemoveMember(tripId);

  const activeInvite = invitations[0];
  const activeUrl = activeInvite ? buildInviteUrl(activeInvite.token) : null;

  async function copyToClipboard(url: string) {
    await Clipboard.setStringAsync(url);
    if (Platform.OS === "web" && globalThis.window) {
      globalThis.window.alert(t("members.copied"));
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

  function confirmRemove(member: TripMember) {
    const name = member.display_name || member.email;
    if (Platform.OS === "web") {
      if (globalThis.window?.confirm(t("members.removeConfirm", { name }))) {
        removeMember.mutate(member.user_id);
      }
    } else {
      Alert.alert(t("members.removeTitle"), t("members.removeConfirm", { name }), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.remove"),
          style: "destructive",
          onPress: () => removeMember.mutate(member.user_id),
        },
      ]);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: trip?.name ?? t("nav.members") }} />

      <FlatList
        ListHeaderComponent={
          <Text className="text-xs uppercase tracking-wide text-ink-muted mb-2 mt-4 px-4">
            {t("members.sectionTitle")}
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
              {item.is_owner ? (
                <Badge variant="brand">{t("members.owner")}</Badge>
              ) : isOwner ? (
                <Button
                  size="sm"
                  variant="danger"
                  onPress={() => confirmRemove(item)}
                  disabled={removeMember.isPending}
                >
                  {t("common.remove")}
                </Button>
              ) : null}
            </Card>
          </View>
        )}
        ListFooterComponent={
          isOwner ? (
            <View className="px-4 mt-4 gap-3">
              <Text className="text-xs uppercase tracking-wide text-ink-muted">
                {t("members.inviteLink")}
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
                      {t("members.expires", {
                        date: new Date(
                          activeInvite.expires_at,
                        ).toLocaleDateString(activeLocaleTag()),
                      })}
                    </Text>
                    <View className="flex-row gap-2">
                      <Button
                        size="sm"
                        onPress={() => copyToClipboard(activeUrl)}
                      >
                        {t("members.copyLink")}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onPress={revokeLink}
                        disabled={revokeMutation.isPending}
                      >
                        {t("members.revoke")}
                      </Button>
                    </View>
                  </>
                ) : (
                  <EmptyState
                    title={t("members.noActiveInviteTitle")}
                    description={t("members.noActiveInviteDescription")}
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
                  {activeInvite
                    ? t("members.generateNew")
                    : t("members.generate")}
                </Button>
              </Card>
            </View>
          ) : null
        }
      />
    </View>
  );
}
