import { StyleSheet, Text, View } from 'react-native';

// Build-pipeline smoke screen only; replaced by the login and tab screens.
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BarberLog</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF7F2' },
  title: { fontSize: 28, fontWeight: '600', color: '#171717' },
});
