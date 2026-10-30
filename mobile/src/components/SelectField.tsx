import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { id } from '@/locales/id';
import { colors, radius, spacing, touchTarget } from '@/theme';

export type SelectOption = { value: string; label: string };

type SelectFieldProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
};

/** Picker for a short list: opens a modal sheet of full-height rows. */
export function SelectField({ label, value, options, onChange, placeholder = id.select.choose, error }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        onPress={() => setOpen(true)}
        style={[styles.input, error ? styles.invalid : undefined]}
      >
        <Text style={[styles.value, !selected && styles.placeholder]}>{selected?.label ?? placeholder}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet} accessibilityViewIsModal>
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {label}
            </Text>
            <FlatList
              data={options}
              keyExtractor={(option) => option.value}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: item.value === value }}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={[styles.row, item.value === value && styles.rowSelected]}
                >
                  <Text style={[styles.rowText, item.value === value && styles.rowTextSelected]}>{item.label}</Text>
                </Pressable>
              )}
            />
            <Button title={id.select.close} variant="outline" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
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
  placeholder: { color: colors.mutedForeground },
  error: { fontSize: 14, color: colors.destructive },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.lg },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: colors.foreground },
  row: { minHeight: touchTarget, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.md },
  rowSelected: { backgroundColor: colors.secondary },
  rowText: { fontSize: 16, color: colors.foreground },
  rowTextSelected: { fontWeight: '700' },
});
