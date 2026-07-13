import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Platform, Pressable, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { Input } from "../../components/Input";
import type { Plan } from "../../domain/plans/types";
import {
  useAddPlanLink,
  useDeletePlanLink,
} from "../../domain/plans/usePlans";

function openUrl(url: string) {
  if (Platform.OS === "web") {
    globalThis.window?.open(url, "_blank", "noopener,noreferrer");
  } else {
    Linking.openURL(url).catch(() => {
      // Best-effort: ignore unopenable URLs.
    });
  }
}

/** Documentation links for a plan (Drive folders, maps, bookings...).
 * Links persist immediately via their own mutations — independent of the
 * plan's Save button. */
export function PlanLinks({ tripId, plan }: { tripId: string; plan: Plan }) {
  const { t } = useTranslation();
  const links = plan.links ?? [];
  const addLink = useAddPlanLink(tripId, plan.id);
  const deleteLink = useDeletePlanLink(tripId, plan.id);

  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  const canAdd = url.trim().length > 0 && !addLink.isPending;

  async function handleAdd() {
    if (!canAdd) return;
    try {
      await addLink.mutateAsync({
        url: url.trim(),
        label: label.trim() ? label.trim() : null,
      });
      setUrl("");
      setLabel("");
    } catch {
      // Error surfaced below via addLink.error.
    }
  }

  return (
    <View className="gap-2">
      <Text className="text-sm text-ink-secondary font-medium">
        {t("plans.documentation")}
      </Text>

      {links.map((link) => (
        <View key={link.id} className="flex-row items-center gap-2">
          <Pressable className="flex-1" onPress={() => openUrl(link.url)}>
            <Text className="text-sm text-brand-600" numberOfLines={1}>
              🔗 {link.label || link.url}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => link.id && deleteLink.mutate(link.id)}
            disabled={deleteLink.isPending}
            hitSlop={8}
            className="p-1"
          >
            <Icon name="x" size={16} color="#94a3b8" />
          </Pressable>
        </View>
      ))}

      <Input
        value={url}
        onChangeText={setUrl}
        placeholder="https://drive.google.com/..."
        autoCapitalize="none"
        keyboardType="url"
        editable={!addLink.isPending}
      />
      <Input
        value={label}
        onChangeText={setLabel}
        placeholder={t("plans.linkLabelPlaceholder")}
        editable={!addLink.isPending}
      />
      {addLink.error ? (
        <Text className="text-xs text-danger-500">
          {t("plans.addLinkError")}
        </Text>
      ) : null}
      <Button
        size="sm"
        variant="secondary"
        onPress={handleAdd}
        disabled={!canAdd}
        isLoading={addLink.isPending}
      >
        {t("plans.addLink")}
      </Button>
    </View>
  );
}
