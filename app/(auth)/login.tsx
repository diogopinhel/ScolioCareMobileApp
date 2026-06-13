import { useState } from 'react';
import {
  View,
  Text,
  Image,
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
import { useTranslation } from '../../src/i18n';
import type { TFunction } from 'i18next';

export default function Login() {
  const { login } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [passwordVisivel, setPasswordVisivel] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setErro(t('auth.login.erroCamposVazios'));
      return;
    }

    setErro(null);
    setACarregar(true);

    try {
      const { needsTwoFactor } = await login(email.trim().toLowerCase(), password);
      if (needsTwoFactor) {
        router.push({
          pathname: '/(auth)/two-factor-verify' as never,
          params: { email: email.trim().toLowerCase(), modo: 'login' },
        });
      }
    } catch (e: any) {
      const mensagem = traduzirErro(e?.message ?? '', t);
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
            <Image
              source={require('../../assets/logo_scoliocare.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appName}>ScolioCare</Text>
            <Text style={styles.tagline}>{t('auth.login.tagline')}</Text>
          </View>

          {/* Formulário */}
          <View style={styles.form}>
            <Text style={styles.title}>{t('auth.login.titulo')}</Text>
            <Text style={styles.subtitle}>{t('auth.login.subtitulo')}</Text>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.login.emailLabel')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(v) => { setEmail(v); setErro(null); }}
                placeholder={t('auth.login.emailPlaceholder')}
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.login.passwordLabel')}</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErro(null); }}
                  placeholder={t('auth.login.passwordPlaceholder')}
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
                  <Text style={styles.eyeText}>{passwordVisivel ? t('auth.login.ocultar') : t('auth.login.ver')}</Text>
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
                <Text style={styles.buttonText}>{t('auth.login.entrar')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.esqueciLink}
              onPress={() => router.push('/(auth)/recuperar-password' as never)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.esqueciLinkTxt}>{t('auth.login.esqueceuPassword')}</Text>
            </TouchableOpacity>

          </View>

          {/* Criar conta */}
          <View style={styles.criarContaWrap}>
            <Text style={styles.criarContaTxt}>{t('auth.login.semContaPergunta')}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register' as never)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.criarContaLink}>{t('auth.login.criarConta')}</Text>
            </TouchableOpacity>
          </View>

          {/* Rodapé */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {t('auth.login.rodape')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function traduzirErro(mensagem: string, t: TFunction): string {
  if (mensagem.includes('Invalid login credentials') || mensagem.includes('invalid_credentials')) {
    return t('auth.login.erroCredenciais');
  }
  if (mensagem.includes('Email not confirmed')) {
    return t('auth.login.erroNaoConfirmado');
  }
  if (mensagem.includes('Too many requests')) {
    return t('auth.login.erroDemasiadasTentativas');
  }
  if (mensagem.includes('bloqueada')) return t('auth.login.erroBloqueada');
  if (mensagem.includes('pacientes')) return t('auth.login.erroApenasPacientes');
  return t('auth.login.erroInesperado');
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 24 },

  header: { alignItems: 'center', paddingTop: 48, paddingBottom: 32 },
  logoImage: {
    width: 110,
    height: 110,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
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

  criarContaWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  criarContaTxt: { fontSize: 14, color: '#6B7280' },
  criarContaLink: { fontSize: 14, color: '#1A6FAF', fontWeight: '700' },

  esqueciLink: { alignItems: 'center', marginTop: 14 },
  esqueciLinkTxt: { fontSize: 13, color: '#1A6FAF', fontWeight: '500' },

  footer: { paddingVertical: 24, alignItems: 'center' },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
});
