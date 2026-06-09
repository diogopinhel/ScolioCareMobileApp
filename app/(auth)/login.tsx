import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [passwordVisivel, setPasswordVisivel] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setErro('Por favor preencha o email e a password.');
      return;
    }

    setErro(null);
    setACarregar(true);

    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: any) {
      const mensagem = traduzirErro(e?.message ?? '');
      setErro(mensagem);
    } finally {
      setACarregar(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>SC</Text>
            </View>
            <Text style={styles.appName}>ScolioScan</Text>
            <Text style={styles.tagline}>Portal do Paciente</Text>
          </View>

          {/* Formulário */}
          <View style={styles.form}>
            <Text style={styles.title}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>Inicie sessão para aceder aos seus dados</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(v) => { setEmail(v); setErro(null); }}
                placeholder="exemplo@email.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErro(null); }}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!passwordVisivel}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setPasswordVisivel((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.eyeText}>{passwordVisivel ? 'Ocultar' : 'Ver'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {erro && (
              <View style={styles.erroContainer}>
                <Text style={styles.erroTexto}>{erro}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, aCarregar && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={aCarregar}
              activeOpacity={0.85}
            >
              {aCarregar ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBox}
              onPress={() => {
                setEmail('maria.silva@scolio.pt');
                setPassword('paciente123');
                setErro(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.demoLabel}>Credenciais de teste</Text>
              <Text style={styles.demoCredencial}>maria.silva@scolio.pt</Text>
              <Text style={styles.demoCredencial}>paciente123</Text>
            </TouchableOpacity>
          </View>

          {/* Criar conta */}
          <View style={styles.criarContaWrap}>
            <Text style={styles.criarContaTxt}>Ainda não tem conta? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register' as never)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.criarContaLink}>Criar conta</Text>
            </TouchableOpacity>
          </View>

          {/* Rodapé */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Problemas ao entrar? Contacte o seu médico ou técnico responsável.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function traduzirErro(mensagem: string): string {
  if (mensagem.includes('Invalid login credentials') || mensagem.includes('invalid_credentials')) {
    return 'Email ou password incorretos.';
  }
  if (mensagem.includes('Email not confirmed')) {
    return 'A sua conta ainda não foi ativada. Verifique o seu email.';
  }
  if (mensagem.includes('Too many requests')) {
    return 'Demasiadas tentativas. Aguarde alguns minutos e tente novamente.';
  }
  if (mensagem.includes('bloqueada')) return mensagem;
  if (mensagem.includes('pacientes')) return mensagem;
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 24 },

  header: { alignItems: 'center', paddingTop: 48, paddingBottom: 32 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#1A6FAF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#1A6FAF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: 1 },
  appName: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  tagline: { fontSize: 14, color: '#6B7280' },

  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1A1A2E',
    backgroundColor: '#F9FAFB',
  },
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
  eyeButton: { paddingLeft: 8 },
  eyeText: { fontSize: 13, color: '#1A6FAF', fontWeight: '500' },

  erroContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  erroTexto: { color: '#EF4444', fontSize: 13, textAlign: 'center' },

  button: {
    backgroundColor: '#1A6FAF',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#1A6FAF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  demoBox: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
  },
  demoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A6FAF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  demoCredencial: { fontSize: 13, color: '#374151', lineHeight: 20 },

  criarContaWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  criarContaTxt: { fontSize: 14, color: '#6B7280' },
  criarContaLink: { fontSize: 14, color: '#1A6FAF', fontWeight: '700' },

  footer: { paddingVertical: 24, alignItems: 'center' },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
});
