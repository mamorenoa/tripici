import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { useLogin } from "../../domain/auth/useLogin";

export function LoginScreen() {
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
    <View className="flex-1 bg-background justify-center px-4">
      <View className="gap-2 items-center mb-6">
        <Text className="text-3xl font-bold text-ink-primary">Tripinci</Text>
        <Text className="text-sm text-ink-secondary">
          Track shared trip expenses with your people.
        </Text>
      </View>

      <Card className="gap-4">
        <Text className="text-xl font-semibold text-ink-primary">Sign in</Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          autoFocus
          editable={!mutation.isPending}
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          editable={!mutation.isPending}
        />

        {mutation.isError ? (
          <Text className="text-sm text-danger-500">
            Invalid email or password.
          </Text>
        ) : null}

        <Button
          onPress={onSubmit}
          disabled={!canSubmit}
          isLoading={mutation.isPending}
          size="lg"
        >
          Sign in
        </Button>
      </Card>

      <View className="flex-row gap-1.5 justify-center mt-6">
        <Text className="text-ink-secondary">No account yet?</Text>
        <Link
          href={
            typeof redirect === "string" && redirect.length > 0
              ? `/register?redirect=${encodeURIComponent(redirect)}`
              : "/register"
          }
          className="text-brand-600 font-semibold"
        >
          Create one
        </Link>
      </View>
    </View>
  );
}
