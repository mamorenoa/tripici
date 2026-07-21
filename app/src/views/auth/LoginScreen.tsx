import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { Input } from "../../components/Input";
import { useLogin } from "../../domain/auth/useLogin";
import { colors } from "../../lib/theme";
import { AuthShell } from "./AuthShell";

export function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  // Honoured after a successful login so deep links (e.g. invite URLs)
  // resume at the intended path.
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useLogin();

  const canSubmit =
    email.trim().length > 0 && password.length > 0 && !mutation.isPending;

  async function onSubmit() {
    if (!canSubmit) return;
    try {
      await mutation.mutateAsync({ email: email.trim(), password });
      const target =
        typeof redirect === "string" && redirect.length > 0 ? redirect : "/";
      router.replace(target);
    } catch {
      // Surfaced below via mutation.error.
    }
  }

  return (
    <AuthShell tagline={t("auth.tagline")}>
      <View className="gap-6">
        <Card className="gap-4 p-6 border border-border">
          <Input
            label={t("common.email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="alex@example.com"
            autoFocus
            editable={!mutation.isPending}
          />

          <Input
            label={t("common.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            editable={!mutation.isPending}
          />

          {mutation.isError ? (
            <View className="flex-row items-center gap-1.5">
              <Icon name="alert-circle" size={16} color={colors.danger[500]} />
              <Text className="text-sm text-danger-500 flex-1">
                {t("auth.invalidCredentials")}
              </Text>
            </View>
          ) : null}

          <Button
            onPress={onSubmit}
            disabled={!canSubmit}
            isLoading={mutation.isPending}
            size="lg"
            className="w-full"
          >
            {t("auth.signIn")}
          </Button>
        </Card>

        <View className="flex-row gap-1.5 justify-center">
          <Text className="text-ink-secondary">{t("auth.noAccount")}</Text>
          <Link
            href={
              typeof redirect === "string" && redirect.length > 0
                ? `/register?redirect=${encodeURIComponent(redirect)}`
                : "/register"
            }
            className="text-brand-600 font-semibold"
          >
            {t("auth.createOne")}
          </Link>
        </View>
      </View>
    </AuthShell>
  );
}
