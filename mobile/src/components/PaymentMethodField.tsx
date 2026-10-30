import { Pressable, StyleSheet, Text, View } from 'react-native';

import { id } from '@/locales/id';
import { colors, radius, spacing, touchTarget } from '@/theme';
import type { PaymentMethod } from '@/types';

const methods: PaymentMethod[] = ['cash', 'qris', 'transfer'];

type PaymentMethodFieldProps = {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  error?: string;
};

export function PaymentMethodField({ value, onChange, error }: PaymentMethodFieldProps) {
  return (
    <View style={styles.wrapper} accessibilityRole="radiogroup">
      <Text style={styles.label}>{id.common.paymentMethod}</Text>
      <View style={styles.row}>
        {methods.map((method) => {
          const checked = value === method;

          return (
            <Pressable
              key={method}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              onPress={() => onChange(method)}
              style={[styles.option, checked && styles.checked]}
            >
              <Text style={[styles.optionText, checked && styles.checkedText]}>{id.payment[method]}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  row: { flexDirection: 'row', gap: spacing.sm },
  option: {
    flex: 1,
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  checked: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  checkedText: { color: colors.primaryForeground },
  error: { fontSize: 14, color: colors.destructive },
});
