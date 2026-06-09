import { useEffect, useRef, useState } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';

type Modo = 'login' | 'ativar';

export default function TwoFactorVerifyScreen() {
  const { email, modo } = useLocalSearchParams<{ email: string; modo: Modo }>();
  const { verificar2FA, verificarEAtivar2FA, enviarOtp2FA } = useAuth();

  const [digitos, setDigitos] = useState(['', '', '', '', '', '']);
  const [aVerificar, setAVerificar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const ref0 = useRef<TextInput>(null);
  const ref1 = useRef<TextInput>(null);
  const ref2 = useRef<TextInput>(null);
  const ref3 = useRef<TextInput>(null);
  const ref4 = useRef<TextInput>(null);
  const ref5 = useRef<TextInput>(null);
  const refs = [ref0, ref1, ref2, ref3, ref4, ref5];

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function handleChange(i: number, value: string) {
    const clean = value.replace(/\D/g, '');
    // Handle paste of full code
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split('');
      const novos = ['', '', '', '', '', ''];
      chars.forEach((c, idx) => { novos[idx] = c; });
      setDigitos(novos);
      refs[Math.min(chars.length, 5)].current?.focus();
      return;
    }
    const char = clean.slice(-1);
    const novos = [...digitos];
    novos[i] = char;
    setDigitos(novos);
    setErro(null);
    if (char && i < 5) refs[i + 1].current?.focus();
  }

  function handleKeyPress(i: number, key: string) {
    if (key === 'Backspace' && !digitos[i] && i > 0) {
      const novos = [...digitos];
      novos[i - 1] = '';
      setDigitos(novos);
      refs[i - 1].current?.focus();
    }
  }

  async function handleVerificar() {
    const codigo = digitos.join('');
    if (codigo.length < 6) {
      setErro('Introduza os 6 dígitos do código.');
      return;
    }
    setErro(null);
    setAVerificar(true);
    try {
      if (modo === 'ativar') {
        await verificarEAtivar2FA(email, codigo);
        Alert.alert(
          'Autenticação ativada',
          'A autenticação de dois fatores foi ativada com sucesso.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        await verificar2FA(email, codigo);
        // NavigationGuard handles redirect to /(tabs)/home once estaAutenticado = true
      }
    } catch (e: any) {
      setErro(traduzirErro(e?.message ?? ''));
      setDigitos(['', '', '', '', '', '']);
      refs[0].current?.focus();
    } finally {
      setAVerificar(false);
    }
  }

  async function handleReenviar() {
    if (cooldown > 0) return;
    try {
      await enviarOtp2FA(email);
      setCooldown(60);
      setDigitos(['', '', '', '', '', '']);
      setErro(null);
      refs[0].current?.focus();
    } catch {
      Alert.alert('Erro', 'Não foi possível reenviar o código. Tente novamente.');
    }
  }

  function handleVoltar() {
    if (modo === 'ativar') {
      router.back();
    } else {
      router.replace('/(auth)/login');
    }
  }

  const codigoCompleto = digitos.every((d) => d !== '');

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
          {/* Voltar */}
          <TouchableOpacity
            style={styles.btnVoltar}
            onPress={handleVoltar}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={20} color="#1A1A2E" />
          </TouchableOpacity>

          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Mail size={32} color="#1A6FAF" />
            </View>
            <Text style={styles.titulo}>Verificação em dois passos</Text>
            <Text style={styles.subtitulo}>
              Enviámos um código de 6 dígitos para{'\n'}
              <Text style={styles.emailTxt}>{email}</Text>
            </Text>
          </View>

          {/* Caixas de código */}
          <View style={styles.codigoWrap}>
            {digitos.map((d, i) => (
              <TextInput
                key={i}
                ref={refs[i]}
                style={[
                  styles.caixa,
                  !!d && styles.caixaPreenchida,
                  !!erro && styles.caixaErro,
                ]}
                value={d}
                onChangeText={(v) => handleChange(i, v)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={6}
                selectTextOnFocus
                autoFocus={i === 0}
              />
            ))}
          </View>

          {/* Erro */}
          {erro && (
            <View style={styles.erroWrap}>
              <Text style={styles.erroTxt}>{erro}</Text>
            </View>
          )}

          {/* Botão verificar */}
          <TouchableOpacity
            style={[styles.btnVerificar, (!codigoCompleto || aVerificar) && styles.btnDisabled]}
            onPress={handleVerificar}
            disabled={!codigoCompleto || aVerificar}
            activeOpacity={0.85}
          >
            {aVerificar ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnVerificarTxt}>Verificar código</Text>
            )}
          </TouchableOpacity>

          {/* Reenviar */}
          <View style={styles.reenviarWrap}>
            <Text style={styles.reenviarTxt}>Não recebeu o código? </Text>
            <TouchableOpacity
              onPress={handleReenviar}
              disabled={cooldown > 0}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.reenviarLink, cooldown > 0 && styles.reenviarDisabled]}>
                {cooldown > 0 ? `Reenviar (${cooldown}s)` : 'Reenviar'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Nota */}
          <View style={styles.notaWrap}>
            <Text style={styles.notaTxt}>
              O código expira em 10 minutos. Se não encontrar o email, verifique a pasta de spam.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function traduzirErro(msg: string): string {
  if (msg.includes('expired') || msg.includes('Token has expired')) {
    return 'O código expirou. Reenvie um novo código.';
  }
  if (msg.includes('Invalid') || msg.includes('invalid') || msg.includes('not found')) {
    return 'Código inválido. Verifique e tente novamente.';
  }
  if (msg.includes('Too many') || msg.includes('rate limit')) {
    return 'Demasiadas tentativas. Aguarde e tente novamente.';
  }
  return 'Ocorreu um erro. Tente novamente.';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },

  btnVoltar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 36,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  emailTxt: {
    fontWeight: '700',
    color: '#1A1A2E',
  },

  codigoWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  caixa: {
    width: 48,
    height: 58,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
  },
  caixaPreenchida: {
    borderColor: '#1A6FAF',
    backgroundColor: '#EFF6FF',
  },
  caixaErro: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },

  erroWrap: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  erroTxt: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
  },

  btnVerificar: {
    backgroundColor: '#1A6FAF',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#1A6FAF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnVerificarTxt: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  reenviarWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  reenviarTxt: { fontSize: 14, color: '#6B7280' },
  reenviarLink: { fontSize: 14, color: '#1A6FAF', fontWeight: '700' },
  reenviarDisabled: { color: '#9CA3AF' },

  notaWrap: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 14,
  },
  notaTxt: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
