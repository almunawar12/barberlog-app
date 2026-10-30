import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  formatDateValue,
  formatJakartaDateTimeValue,
  jakartaToPickerDate,
  nowInJakarta,
  pickerDateToJakarta,
  toJakartaDate,
} from '@/lib/jakarta-time';
import { colors, radius, spacing, touchTarget } from '@/theme';

type FieldShellProps = {
  label: string;
  text: string;
  onPress: () => void;
  error?: string;
};

function FieldShell({ label, text, onPress, error }: FieldShellProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
        onPress={onPress}
        style={[styles.input, error ? styles.invalid : undefined]}
      >
        <Text style={styles.value}>{text}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

type DateTimeFieldProps = {
  label: string;
  /** Jakarta wall clock, "YYYY-MM-DDTHH:mm". */
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

/** Date then time, both read and written as Jakarta wall clock. The future is not selectable. */
export function DateTimeField({ label, value, onChange, error }: DateTimeFieldProps) {
  function pick() {
    const maximumDate = jakartaToPickerDate(nowInJakarta());

    DateTimePickerAndroid.open({
      value: jakartaToPickerDate(value),
      mode: 'date',
      maximumDate,
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) {
          return;
        }

        const withDate = pickerDateToJakarta(date, value);

        DateTimePickerAndroid.open({
          value: jakartaToPickerDate(withDate),
          mode: 'time',
          is24Hour: true,
          onChange: (timeEvent, time) => {
            if (timeEvent.type !== 'set' || !time) {
              return;
            }

            const picked = pickerDateToJakarta(time);
            const day = withDate.slice(0, 10);
            // Never let the time step push the value into the future.
            const next = `${day}T${picked.slice(11)}`;
            const now = nowInJakarta();

            onChange(next > now ? now : next);
          },
        });
      },
    });
  }

  return <FieldShell label={label} text={formatJakartaDateTimeValue(value)} onPress={pick} error={error} />;
}

type DateFieldProps = {
  label: string;
  /** "YYYY-MM-DD", or "" for no date. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder: string;
};

export function DateField({ label, value, onChange, error, placeholder }: DateFieldProps) {
  function pick() {
    DateTimePickerAndroid.open({
      value: jakartaToPickerDate(`${value || toJakartaDate(new Date())}T12:00`),
      mode: 'date',
      onChange: (event, date) => {
        if (event.type === 'set' && date) {
          onChange(pickerDateToJakarta(date, '2000-01-01T12:00').slice(0, 10));
        }
      },
    });
  }

  return <FieldShell label={label} text={value ? formatDateValue(value) : placeholder} onPress={pick} error={error} />;
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  input: {
    minHeight: touchTarget,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
  },
  invalid: { borderColor: colors.destructive },
  value: { fontSize: 16, color: colors.foreground },
  error: { fontSize: 14, color: colors.destructive },
});
