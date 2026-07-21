import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { colors } from "../lib/theme";
import { Icon, type IconName } from "./Icon";

type Props = {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <View className="items-center gap-3 py-10 px-6">
      {icon ? (
        <View className="w-14 h-14 rounded-full bg-brand-50 items-center justify-center">
          <Icon name={icon} size={26} color={colors.brand[600]} />
        </View>
      ) : null}
      <Text className="text-base font-semibold text-ink-primary text-center">
        {title}
      </Text>
      {description ? (
        <Text className="text-sm text-ink-secondary text-center">
          {description}
        </Text>
      ) : null}
      {action}
    </View>
  );
}
