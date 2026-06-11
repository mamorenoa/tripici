import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { useAcceptInvitation } from "../../domain/invitations/useAcceptInvitation";
import { useRegister } from "../../domain/auth/useRegister";

function extractInviteToken(redirect: unknown): string | null {
  if (typeof redirect !== "string") return null;
  const prefix = "/invite/";
  if (!redirect.startsWith(prefix)) return null;
  const rest = redirect.slice(prefix.length);
  const token = rest.split(/[/?#]/)[0];
  return token.length > 0 ? token : null;
}

export function RegisterScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useRegister();
  const acceptMutation = useAcceptInvitation();

  const canSubmit =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    !mutation.isPending &&
    !acceptMutation.isPending;

  async function onSubmit() {
    if (!canSubmit) return;
    try {
      await mutation.mutateAsync({
        email: email.trim(),
        password,
        display_name: displayName.trim(),
      });

      // If the signup was triggered by an invite link, auto-accept the
      // token and jump straight to the trip — the user clearly meant
      // to join. See slice 5 plan for the rationale.
      const inviteToken = extractInviteToken(redirect);
      if (inviteToken) {
        try {
          const trip = await acceptMutation.mutateAsync(inviteToken);
          router.replace(`/trips/${trip.id}`);
          return;
        } catch {
          // Invite invalid: fall through to the regular redirect so the
          // user sees the "no longer valid" screen.
        }
      }

      const target =
        typeof redirect === "string" && redirect.length > 0 ? redirect : "/";
      router.replace(target);
    } catch {
      // Surfaced below via mutation.error.
    }
  }

  return (
    <ScrollView
      contentContainerClassName="flex-grow bg-background justify-center px-4 py-6"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-2 items-center mb-6">
        <Text className="text-3xl font-bold text-ink-primary">Tripinci</Text>
        <Text className="text-sm text-ink-secondary">
          Create your account to start tracking trips.
        </Text>
      </View>

      <Card className="gap-4">
        <Text className="text-xl font-semibold text-ink-primary">
          Create account
        </Text>

        <Input
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          autoFocus
          editable={!mutation.isPending}
        />

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!mutation.isPending}
        />

        <Input
          label="Password"
          helperText="At least 8 characters."
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          editable={!mutation.isPending}
        />

        {mutation.isError ? (
          <Text className="text-sm text-danger-500">
            Could not create account. The email may already be in use.
          </Text>
        ) : null}

        <Button
          onPress={onSubmit}
          disabled={!canSubmit}
          isLoading={mutation.isPending || acceptMutation.isPending}
          size="lg"
        >
          Sign up
        </Button>
      </Card>

      <View className="flex-row gap-1.5 justify-center mt-6">
        <Text className="text-ink-secondary">Already have an account?</Text>
        <Link
          href={
            typeof redirect === "string" && redirect.length > 0
              ? `/login?redirect=${encodeURIComponent(redirect)}`
              : "/login"
          }
          className="text-brand-600 font-semibold"
        >
          Sign in
        </Link>
      </View>
    </ScrollView>
  );
}
