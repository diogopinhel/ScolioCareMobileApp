import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useAuth } from '../src/context/AuthContext';
import { alterarPassword } from '../src/data/repository/auth';
import { getEmailDoPaciente } from '../src/data/repository/perfil';

function validarPassword(password: string): string | null {
  if (password.length < 8) return 'A password deve ter pelo menos 8 caracteres.';
  if (!/[A-Z]/.test(password)) return 'A password deve conter pelo menos uma letra maiúscula.';
  if (!/[0-9]/.test(password)) return 'A password deve conter pelo menos um número.';
  return null;
}

export default function ChangePasswordScreen() {
  const { utilizador } = useAuth();

  const [passwordAtual, setPasswordAtual] = useState('');
  const [novaPassword, setNovaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  const [verAtual, setVerAtual] = useState(false);
  const [verNova, setVerNova] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);

  async function handleGuardar() {
    setErro(null);

    if (!passwordAtual.trim()) {
      setErro('Introduza a sua password atual.');
      return;
    }

    const erroValidacao = validarPassword(novaPassword);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    if (novaPassword !== confirmarPassword) {
      setErro('As passwords não coincidem.');
      return;
    }

    if (novaPassword === passwordAtual) {
      setErro('A nova password deve ser diferente da atual.');
      return;
    }

    if (!utilizador) return;

    const email = await getEmailDoPaciente();
    if (!email) {
      setErro('Não foi possível obter o email da conta.');
      return;
    }

    setAGuardar(true);
    try {
      await alterarPassword(email, passwordAtual, novaPassword);
      Alert.alert(
        'Password alterada',
        'A sua password foi alterada com sucesso.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      setErro(msg || 'Não foi possível alterar a password. Tente novamente.');
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.btnVoltar}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Alterar palavra-passe</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.descricao}>
            A nova password deve ter pelo menos 8 caracteres, uma letra maiúscula e um número.
          </Text>

          {/* Password atual */}
          <View style={styles.campo}>
            <Text style={styles.label}>Password atual</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputFlex}
                value={passwordAtual}
                onChangeText={(v) => { setPasswordAtual(v); setErro(null); }}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!verAtual}
                autoComplete="password"
                returnKeyType="next"
              />
              <TouchableOpacity
                onPress={() => setVerAtual((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.verTxt}>{verAtual ? 'Ocultar' : 'Ver'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Nova password */}
          <View style={styles.campo}>
            <Text style={styles.label}>Nova password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputFlex}
                value={novaPassword}
                onChangeText={(v) => { setNovaPassword(v); setErro(null); }}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!verNova}
                autoComplete="new-password"
                returnKeyType="next"
              />
              <TouchableOpacity
                onPress={() => setVerNova((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.verTxt}>{verNova ? 'Ocultar' : 'Ver'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirmar nova password */}
          <View style={styles.campo}>
            <Text style={styles.label}>Confirmar nova password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputFlex}
                value={confirmarPassword}
                onChangeText={(v) => { setConfirmarPassword(v); setErro(null); }}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!verConfirmar}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleGuardar}
              />
              <TouchableOpacity
                onPress={() => setVerConfirmar((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.verTxt}>{verConfirmar ? 'Ocultar' : 'Ver'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {erro && (
            <View style={styles.erroBox}>
              <Text style={styles.erroTxt}>{erro}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btnGuardar, aGuardar && styles.btnDisabled]}
            onPress={handleGuardar}
            disabled={aGuardar}
            activeOpacity={0.85}
          >
            {aGuardar ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnGuardarTxt}>Guardar password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  btnVoltar: { width: 40, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitulo: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },

  scroll: { padding: 24, paddingBottom: 40 },

  descricao: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 28,
  },

  campo: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    height: 48,
    paddingHorizontal: 14,
  },
  inputFlex: { flex: 1, fontSize: 15, color: '#1A1A2E' },
  verTxt: { fontSize: 13, color: '#1A6FAF', fontWeight: '500', paddingLeft: 8 },

  erroBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  erroTxt: { color: '#EF4444', fontSize: 13, textAlign: 'center' },

  btnGuardar: {
    backgroundColor: '#1A6FAF',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A6FAF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnGuardarTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
