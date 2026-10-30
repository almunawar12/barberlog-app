import { Alert, Platform, ToastAndroid } from 'react-native';

/** Short confirmation, shown only after the server has confirmed the change. */
export function notify(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
}
