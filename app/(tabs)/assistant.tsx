import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';

export default function AssistantScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <MessageCircle size={48} color="#6B7280" />
        <Text style={styles.title}>Assistente</Text>
        <Text style={styles.label}>Em construção</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  label: { fontSize: 14, color: '#6B7280' },
});
