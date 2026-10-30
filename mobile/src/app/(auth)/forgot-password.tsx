import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { FormAlert } from '@/components/FormAlert';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { request } from '@/lib/api-client';
import { describeWriteError } from '@/lib/errors';
import type { WriteFailure } from '@/lib/errors';
import { id } from '@/locales/id';
import { colors } from '@/theme';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<WriteFailure | null>(null);

  async function submit() {
    setFailure(null);
    setMessage(null);
    setBusy(true);

    try {
      // The server answers the same way for known and unknown emails.
      const response = await request<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim() },
        auth: false,
      });
      setMessage(response.message);
    } catch (error) {
      setFailure(describeWriteError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      {message && (
        <Text accessibilityLiveRegion="polite" style={styles.success}>
          {message}
        </Text>
      )}
      {failure && failure.kind !== 'validation' && <FormAlert message={failure.message} />}
      <TextField
        label={id.auth.email}
        hint={id.auth.forgotHint}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={failure?.fieldErrors.email}
      />
      <Button
        title={busy ? id.auth.sending : id.auth.sendLink}
        loading={busy}
        disabled={email.trim() === ''}
        onPress={submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: { fontSize: 15, color: colors.foreground, backgroundColor: colors.secondary, padding: 12, borderRadius: 8 },
});
