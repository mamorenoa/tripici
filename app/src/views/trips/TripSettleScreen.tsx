import { Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Platform, ScrollView, Text, View } from "react-native";

import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { useCurrentUser } from "../../domain/auth/useCurrentUser";
import type {
  MemberBalance,
  PaymentRead,
  Settlement,
} from "../../domain/settlements/types";
import {
  useDeletePayment,
  useRecordPayment,
  useTripSettlement,
} from "../../domain/settlements/useTripSettlement";
import { useTrip } from "../../domain/trips/useTrip";
import i18n from "../../lib/i18n";
import { formatEuros } from "../../lib/money";

/** Cross-platform confirmation (web uses window.confirm; native uses Alert).
 * Reads labels from the i18n instance imperatively (not reactive — fine
 * for a one-shot dialog). */
function confirm(message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (globalThis.window?.confirm(message)) onConfirm();
  } else {
    Alert.alert(i18n.t("common.confirm"), message, [
      { text: i18n.t("common.cancel"), style: "cancel" },
      { text: i18n.t("common.ok"), onPress: onConfirm },
    ]);
  }
}

// ── Section: balances ─────────────────────────────────────────────

function BalancesSection({
  rows,
  currentUserId,
}: {
  rows: MemberBalance[];
  currentUserId?: string;
}) {
  const { t } = useTranslation();
  return (
    <Card className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        {t("settle.balances")}
      </Text>
      {rows.map((r) => {
        const you = r.user_id === currentUserId;
        const owes = r.balance_cents < 0;
        const settled = r.balance_cents === 0;
        return (
          <View key={r.user_id} className="flex-row items-center gap-2">
            <Avatar name={r.display_name} size={24} />
            <Text className="flex-1 text-sm text-ink-primary">
              {you
                ? t("common.nameYou", { name: r.display_name })
                : r.display_name}
            </Text>
            {settled ? (
              <Text className="text-sm text-ink-muted">
                {t("settle.settled")}
              </Text>
            ) : (
              <Text
                className={`text-sm font-semibold ${
                  owes ? "text-danger-500" : "text-brand-600"
                }`}
              >
                {owes ? t("settle.owes") : t("settle.getsBack")}
                {formatEuros(Math.abs(r.balance_cents))}
              </Text>
            )}
          </View>
        );
      })}
    </Card>
  );
}

// ── Section: who owes whom (with Settle button) ───────────────────

function SettlementsSection({
  rows,
  currentUserId,
  onSettle,
  busy,
}: {
  rows: Settlement[];
  currentUserId?: string;
  onSettle: (s: Settlement) => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Card className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        {t("settle.whoOwesWhom")}
      </Text>
      {rows.map((r, i) => {
        const involvesYou =
          r.from_user_id === currentUserId || r.to_user_id === currentUserId;
        return (
          <View
            key={`${r.from_user_id}-${r.to_user_id}-${i}`}
            className="flex-row items-center gap-2"
          >
            <Text
              className={`flex-1 text-sm ${
                involvesYou
                  ? "text-ink-primary font-medium"
                  : "text-ink-secondary"
              }`}
            >
              {r.from_name} → {r.to_name}
            </Text>
            <Text className="text-sm font-semibold text-ink-primary">
              {formatEuros(r.amount_cents)}
            </Text>
            <Button size="sm" onPress={() => onSettle(r)} disabled={busy}>
              {t("settle.settleBtn")}
            </Button>
          </View>
        );
      })}
    </Card>
  );
}

// ── Section: recorded payments (with Undo) ────────────────────────

function PaymentsSection({
  rows,
  onUndo,
  busy,
}: {
  rows: PaymentRead[];
  onUndo: (p: PaymentRead) => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Card className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        {t("settle.recordedPayments")}
      </Text>
      {rows.map((p) => (
        <View key={p.id} className="flex-row items-center gap-2">
          <Text className="flex-1 text-sm text-ink-secondary">
            {p.from_name} → {p.to_name}
          </Text>
          <Text className="text-sm font-semibold text-ink-primary">
            {formatEuros(p.amount_cents)}
          </Text>
          <Button
            size="sm"
            variant="danger"
            onPress={() => onUndo(p)}
            disabled={busy}
          >
            {t("settle.undo")}
          </Button>
        </View>
      ))}
    </Card>
  );
}

// ── Screen ────────────────────────────────────────────────────────

export function TripSettleScreen() {
  const { t } = useTranslation();
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: trip } = useTrip(tripId);
  const { data: currentUser } = useCurrentUser();
  const { data, isLoading, error } = useTripSettlement(tripId);
  const recordPayment = useRecordPayment(tripId);
  const deletePayment = useDeletePayment(tripId);

  const busy = recordPayment.isPending || deletePayment.isPending;

  function handleSettle(s: Settlement) {
    confirm(
      t("settle.settleConfirm", {
        from: s.from_name,
        to: s.to_name,
        amount: formatEuros(s.amount_cents),
      }),
      () =>
        recordPayment.mutate({
          from_user_id: s.from_user_id,
          to_user_id: s.to_user_id,
          amount_cents: s.amount_cents,
        }),
    );
  }

  function handleUndo(p: PaymentRead) {
    confirm(
      t("settle.undoConfirm", {
        amount: formatEuros(p.amount_cents),
        from: p.from_name,
        to: p.to_name,
      }),
      () => deletePayment.mutate(p.id),
    );
  }

  const hasSettlements = !!data && data.settlements.length > 0;
  const hasPayments = !!data && data.payments.length > 0;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: trip?.name
            ? t("settle.titleTrip", { trip: trip.name })
            : t("settle.title"),
        }}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-ink-muted text-center">
            {t("settle.loadError")}
          </Text>
        </View>
      ) : !hasSettlements && !hasPayments ? (
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon="check"
            title={t("settle.allSettledTitle")}
            description={t("settle.allSettledDescription")}
          />
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-4 py-4 gap-4 pb-10">
          {hasSettlements ? (
            <>
              <BalancesSection
                rows={data.balances}
                currentUserId={currentUser?.id}
              />
              <SettlementsSection
                rows={data.settlements}
                currentUserId={currentUser?.id}
                onSettle={handleSettle}
                busy={busy}
              />
            </>
          ) : (
            <Card>
              <Text className="text-sm text-ink-secondary text-center">
                {t("settle.everythingSettled")}
              </Text>
            </Card>
          )}

          {hasPayments ? (
            <PaymentsSection
              rows={data.payments}
              onUndo={handleUndo}
              busy={busy}
            />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
