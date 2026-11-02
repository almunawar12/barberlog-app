import { usePreventRemove } from 'expo-router';
import { Alert } from 'react-native';

import { id } from '@/locales/id';

/**
 * Asks before leaving a form with unsaved changes. Call allowNavigation() right after a
 * confirmed save so leaving the screen is not mistaken for abandoning edits.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  // repeat() lifts the prevention before re-dispatching; dispatching the action directly
  // would be blocked again and loop forever.
  const disablePrevention = usePreventRemove(isDirty, ({ repeat }) => {
    Alert.alert(id.common.leaveTitle, id.common.leaveBody, [
      { text: id.common.stay, style: 'cancel' },
      { text: id.common.leave, style: 'destructive', onPress: repeat },
    ]);
  });

  return { allowNavigation: disablePrevention };
}
