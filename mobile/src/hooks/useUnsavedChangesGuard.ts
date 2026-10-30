import { useNavigation, usePreventRemove } from 'expo-router';
import { useRef } from 'react';
import { Alert } from 'react-native';

import { id } from '@/locales/id';

/**
 * Asks before leaving a form with unsaved changes. Call allowNavigation() right after a
 * confirmed save so leaving the screen is not mistaken for abandoning edits.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const navigation = useNavigation();
  const allowed = useRef(false);

  usePreventRemove(isDirty, ({ data }) => {
    if (allowed.current) {
      navigation.dispatch(data.action);

      return;
    }

    Alert.alert(id.common.leaveTitle, id.common.leaveBody, [
      { text: id.common.stay, style: 'cancel' },
      { text: id.common.leave, style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  return {
    allowNavigation: () => {
      allowed.current = true;
    },
  };
}
