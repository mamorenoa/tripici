import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { Input } from "../../components/Input";
import { useAcceptInvitation } from "../../domain/invitations/useAcceptInvitation";
import { useRegister } from "../../domain/auth/useRegister";
import { colors } from "../../lib/theme";
import { AuthShell } from "./AuthShell";

function extractInviteToken(redirect: unknown): string | null {
  if (typeof redirect !== "string") return null;
  const prefix = "/invite/";
  if (!redirect.startsWith(prefix)) return null;
  const rest = redirect.slice(prefix.length);
  const token = rest.split(/[/?#]/)[0];
  return token.length > 0 ? token : null;
}

export function RegisterScreen() {
  const { t } = useTranslation();
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
    <AuthShell tagline={t("auth.registerTagline")}>
      <View className="gap-6">
        <Card className="gap-5 p-6 border border-border">
          <View className="gap-1">
            <Text className="text-lg font-semibold text-ink-primary">
              {t("auth.createAccount")}
            </Text>
            <Text className="text-sm text-ink-secondary">
              {t("auth.createAccountSubtitle")}
            </Text>
          </View>

          <Input
            label={t("common.displayName")}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Alex Rivers"
            autoFocus
            editable={!mutation.isPending}
          />

          <Input
            label={t("common.email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="alex@example.com"
            editable={!mutation.isPending}
          />

          <Input
            label={t("common.password")}
            helperText={t("auth.passwordHelper")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            editable={!mutation.isPending}
          />

          {mutation.isError ? (
            <View className="flex-row items-center gap-1.5">
              <Icon name="alert-circle" size={16} color={colors.danger[500]} />
              <Text className="text-sm text-danger-500 flex-1">
                {t("auth.registerError")}
              </Text>
            </View>
          ) : null}

          <Button
            onPress={onSubmit}
            disabled={!canSubmit}
            isLoading={mutation.isPending || acceptMutation.isPending}
            size="lg"
            className="w-full"
          >
            {t("auth.signUp")}
          </Button>
        </Card>

        <View className="flex-row gap-1.5 justify-center">
          <Text className="text-ink-secondary">{t("auth.haveAccount")}</Text>
          <Link
            href={
              typeof redirect === "string" && redirect.length > 0
                ? `/login?redirect=${encodeURIComponent(redirect)}`
                : "/login"
            }
            className="text-brand-600 font-semibold"
          >
            {t("auth.signIn")}
          </Link>
        </View>
      </View>
    </AuthShell>
  );
}
