import { Stack, useLocalSearchParams } from "expo-router";
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
import { formatEuros } from "../../lib/money";

/** Cross-platform confirmation (web uses window.confirm; native uses Alert). */
function confirm(message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (globalThis.window?.confirm(message)) onConfirm();
  } else {
    Alert.alert("Confirm", message, [
      { text: "Cancel", style: "cancel" },
      { text: "OK", onPress: onConfirm },
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
  return (
    <Card className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        Balances
      </Text>
      {rows.map((r) => {
        const you = r.user_id === currentUserId;
        const owes = r.balance_cents < 0;
        const settled = r.balance_cents === 0;
        return (
          <View key={r.user_id} className="flex-row items-center gap-2">
            <Avatar name={r.display_name} size={24} />
            <Text className="flex-1 text-sm text-ink-primary">
              {r.display_name}
              {you ? " (you)" : ""}
            </Text>
            {settled ? (
              <Text className="text-sm text-ink-muted">settled</Text>
            ) : (
              <Text
                className={`text-sm font-semibold ${
                  owes ? "text-danger-500" : "text-brand-600"
                }`}
              >
                {owes ? "owes " : "gets back "}
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
  return (
    <Card className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        Who owes whom
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
              Settle
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
  return (
    <Card className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        Recorded payments
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
            Undo
          </Button>
        </View>
      ))}
    </Card>
  );
}

// ── Screen ────────────────────────────────────────────────────────

export function TripSettleScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: trip } = useTrip(tripId);
  const { data: currentUser } = useCurrentUser();
  const { data, isLoading, error } = useTripSettlement(tripId);
  const recordPayment = useRecordPayment(tripId);
  const deletePayment = useDeletePayment(tripId);

  const busy = recordPayment.isPending || deletePayment.isPending;

  function handleSettle(s: Settlement) {
    confirm(
      `Mark ${s.from_name} → ${s.to_name} ${formatEuros(
        s.amount_cents,
      )} as paid?`,
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
      `Undo the ${formatEuros(p.amount_cents)} payment from ${
        p.from_name
      } to ${p.to_name}?`,
      () => deletePayment.mutate(p.id),
    );
  }

  const hasSettlements = !!data && data.settlements.length > 0;
  const hasPayments = !!data && data.payments.length > 0;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: trip?.name ? `${trip.name} · Settle up` : "Settle up",
        }}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-ink-muted text-center">
            Could not load the settlement.
          </Text>
        </View>
      ) : !hasSettlements && !hasPayments ? (
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon="check"
            title="All settled"
            description="No member-paid expenses to settle yet. Add expenses paid by a specific person to see who owes whom."
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
                🎉 Everything is settled.
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
