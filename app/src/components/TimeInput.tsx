import DateTimePicker from "@react-native-community/datetimepicker";
import { createElement, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { colors } from "../lib/theme";

type Props = {
  label?: string;
  value: string; // HH:MM
  onChange: (value: string) => void;
  editable?: boolean;
  error?: string;
};

function hhmmFromDate(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function dateFromHhmm(value: string): Date {
  const [h, m] = value.split(":").map(Number);
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

/**
 * Cross-platform time input.
 *
 * - Web: renders the browser's native `<input type="time">`.
 * - Native: opens the platform's `DateTimePicker` in time mode on tap.
 *
 * The API works in `HH:MM` strings. Empty value = no time set.
 */
export function TimeInput({
  label,
  value,
  onChange,
  editable = true,
  error,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const borderColor = error ? "border-danger-500" : "border-border";

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-xs text-ink-secondary font-semibold uppercase tracking-wide">
          {label}
        </Text>
      ) : null}

      {Platform.OS === "web" ? (
        createElement("input", {
          type: "time",
          value,
          disabled: !editable,
          onChange: (e: { target: { value: string } }) =>
            onChange(e.target.value),
          style: {
            border: `1px solid ${error ? colors.danger[500] : colors.border}`,
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: 16,
            fontFamily: "Inter_400Regular, system-ui",
            color: colors.ink.primary,
            backgroundColor: colors.surface,
            opacity: editable ? 1 : 0.6,
            outline: "none",
          },
        })
      ) : (
        <>
          <Pressable
            onPress={() => editable && setPickerOpen(true)}
            disabled={!editable}
            className={`border ${borderColor} rounded-lg px-4 py-3 bg-surface ${
              !editable ? "opacity-60" : ""
            }`}
          >
            <Text className="text-base text-ink-primary">
              {value || "--:--"}
            </Text>
          </Pressable>
          {pickerOpen ? (
            <DateTimePicker
              value={dateFromHhmm(value)}
              mode="time"
              onChange={(event, selected) => {
                setPickerOpen(false);
                if (event.type === "set" && selected) {
                  onChange(hhmmFromDate(selected));
                }
              }}
            />
          ) : null}
        </>
      )}

      {error ? (
        <Text className="text-xs text-danger-500">{error}</Text>
      ) : null}
    </View>
  );
}
