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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Mail, Lightbulb } from 'lucide-react-native';
import { reenviarEmailVerificacao, verificarOtpRegistar } from '../../src/data/repository/auth';
import { useTranslation } from '../../src/i18n';

function mascarEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visivel = local.slice(0, Math.min(local.length, 5));
  return `${visivel}****@${domain}`;
}

export default function EmailVerificationScreen() {
  const { email: emailParam } = useLocalSearchParams<{ email: string }>();
  const email = emailParam ?? '';
  const { t } = useTranslation();

  const [digitos, setDigitos] = useState(['', '', '', '', '', '']);
  const [aVerificar, setAVerificar] = useState(false);
  const [aReenviar, setAReenviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [reenviadoSucesso, setReenviadoSucesso] = useState(false);

  const ref0 = useRef<TextInput>(null);
  const ref1 = useRef<TextInput>(null);
  const ref2 = useRef<TextInput>(null);
  const ref3 = useRef<TextInput>(null);
  const ref4 = useRef<TextInput>(null);
  const ref5 = useRef<TextInput>(null);
  const refs = [ref0, ref1, ref2, ref3, ref4, ref5];

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function handleChange(i: number, value: string) {
    const clean = value.replace(/\D/g, '');
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

  async function handleConfirmar() {
    const codigo = digitos.join('');
    if (codigo.length < 6) {
      setErro(t('auth.emailVerification.erroCodigoIncompleto'));
      return;
    }
    setErro(null);
    setAVerificar(true);
    try {
      await verificarOtpRegistar(email, codigo);
      router.replace({
        pathname: '/(auth)/email-confirmed' as never,
        params: { email },
      });
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      if (msg.includes('expired') || msg.includes('Token has expired') || msg.includes('Invalid') || msg.includes('invalid')) {
        setErro(t('auth.emailVerification.erroInvalido'));
      } else {
        setErro(t('auth.emailVerification.erroGenerico'));
      }
      setDigitos(['', '', '', '', '', '']);
      refs[0].current?.focus();
    } finally {
      setAVerificar(false);
    }
  }

  async function handleReenviar() {
    if (cooldown > 0 || aReenviar) return;
    setErro(null);
    setReenviadoSucesso(false);
    setAReenviar(true);
    try {
      await reenviarEmailVerificacao(email);
      setReenviadoSucesso(true);
      setCooldown(60);
      setDigitos(['', '', '', '', '', '']);
      refs[0].current?.focus();
    } catch {
      setErro(t('auth.emailVerification.erroReenvio'));
    } finally {
      setAReenviar(false);
    }
  }

  const codigoCompleto = digitos.every((d) => d !== '');

  return (
    <SafeAreaView style={estilos.safe} edges={['top']}>
      <View style={estilos.headerBar}>
        <Text style={estilos.headerBarTitulo}>{t('auth.emailVerification.headerTitulo')}</Text>
      </View>

      <KeyboardAvoidingView
        style={estilos.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={estilos.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Indicador de progresso */}
          <View style={estilos.progresso}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[estilos.progPonto, estilos.progPontoConcluido]} />
            ))}
            <View style={[estilos.progPonto, estilos.progPontoAtivo]} />
          </View>

          {/* Ícone */}
          <View style={estilos.iconCircle}>
            <Mail size={38} color="#1A6FAF" />
          </View>

          <Text style={estilos.titulo}>{t('auth.emailVerification.titulo')}</Text>
          <Text style={estilos.subtitulo}>{t('auth.emailVerification.subtitulo')}</Text>

          {/* Chip com email mascarado */}
          <View style={estilos.emailChip}>
            <Text style={estilos.emailChipTxt}>{mascarEmail(email)}</Text>
          </View>

          {reenviadoSucesso && !erro && (
            <Text style={estilos.feedbackOk}>{t('auth.emailVerification.reenviadoSucesso')}</Text>
          )}

          {/* Caixas OTP */}
          <View style={estilos.codigoWrap}>
            {digitos.map((d, i) => (
              <TextInput
                key={i}
                ref={refs[i]}
                style={[
                  estilos.caixa,
                  !!d && estilos.caixaPreenchida,
                  !!erro && estilos.caixaErro,
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

          {erro && (
            <View style={estilos.erroWrap}>
              <Text style={estilos.erroTxt}>{erro}</Text>
            </View>
          )}

          {/* Botão confirmar */}
          <TouchableOpacity
            style={[estilos.btnPrimario, (!codigoCompleto || aVerificar) && estilos.btnDisabled]}
            onPress={handleConfirmar}
            disabled={!codigoCompleto || aVerificar}
            activeOpacity={0.85}
          >
            {aVerificar ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={estilos.btnPrimarioTxt}>{t('auth.emailVerification.confirmar')}</Text>
            )}
          </TouchableOpacity>

          {/* Reenviar */}
          <View style={estilos.reenviarWrap}>
            <Text style={estilos.reenviarTxt}>{t('auth.emailVerification.naoRecebeuPergunta')}</Text>
            <TouchableOpacity
              onPress={handleReenviar}
              disabled={cooldown > 0 || aReenviar}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[estilos.reenviarLink, (cooldown > 0 || aReenviar) && estilos.reenviarDisabled]}>
                {cooldown > 0
                  ? t('auth.emailVerification.reenviarEmailCooldown', { segundos: cooldown })
                  : t('auth.emailVerification.reenviarEmail')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dica spam */}
          <View style={estilos.hintRow}>
            <View style={estilos.hintIconCircle}>
              <Lightbulb size={12} color="#F59E0B" />
            </View>
            <Text style={estilos.hintTxt}>{t('auth.emailVerification.dicaSpam')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },

  headerBar: {
    backgroundColor: '#1A6FAF',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBarTitulo: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },

  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
  },

  progresso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 40,
  },
  progPonto: { width: 10, height: 10, borderRadius: 5 },
  progPontoConcluido: { backgroundColor: '#1D9E75' },
  progPontoAtivo: { backgroundColor: '#1A6FAF' },

  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EFF6FF',
    borderWidth: 3,
    borderColor: '#1A6FAF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitulo: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 19,
    marginBottom: 20,
  },

  emailChip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  emailChipTxt: { fontSize: 12, color: '#0C447C', fontWeight: '500' },

  feedbackOk: { fontSize: 12, color: '#1D9E75', marginBottom: 12, textAlign: 'center' },

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
  erroTxt: { color: '#EF4444', fontSize: 13, textAlign: 'center' },

  btnPrimario: {
    backgroundColor: '#1A6FAF',
    borderRadius: 11,
    height: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#1A6FAF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimarioTxt: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },

  reenviarWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  reenviarTxt: { fontSize: 14, color: '#6B7280' },
  reenviarLink: { fontSize: 14, color: '#1A6FAF', fontWeight: '700' },
  reenviarDisabled: { color: '#9CA3AF' },

  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
  },
  hintIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  hintTxt: { fontSize: 11, color: '#6B7280', flex: 1, lineHeight: 16 },
});
