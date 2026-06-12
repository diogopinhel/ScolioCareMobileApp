import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Mail, RefreshCw, Lightbulb, CheckCircle } from 'lucide-react-native';
import {
  reenviarEmailVerificacao,
  verificarTokenEmail,
} from '../../src/data/repository/auth';
import { useTranslation } from '../../src/i18n';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mascarEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visivel = local.slice(0, Math.min(local.length, 5));
  return `${visivel}****@${domain}`;
}

function formatarContagem(segundos: number): string {
  if (segundos <= 0) return '00:00';
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Ecrã principal ───────────────────────────────────────────────────────────

export default function EmailVerificationScreen() {
  const { email: emailParam } = useLocalSearchParams<{ email: string }>();
  const email = emailParam ?? '';
  const { t } = useTranslation();

  const [aReenviar, setAReenviar] = useState(false);
  const [aVerificar, setAVerificar] = useState(false);
  const [erroReenvio, setErroReenvio] = useState<string | null>(null);
  const [reenviadoSucesso, setReenviadoSucesso] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [segundosRestantes, setSegundosRestantes] = useState(24 * 60 * 60);

  const larguraAtiva = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.spring(larguraAtiva, {
      toValue: 28,
      useNativeDriver: false,
      damping: 12,
      stiffness: 120,
    }).start();
  }, [larguraAtiva]);

  // Countdown de 24h
  useEffect(() => {
    const interval = setInterval(() => {
      setSegundosRestantes((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cooldown do botão reenviar
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleUrl = useCallback(
    async (url: string) => {
      try {
        const parsed = Linking.parse(url);
        const tokenHash =
          (parsed.queryParams?.token_hash as string | undefined) ??
          (parsed.queryParams?.token as string | undefined);
        if (!tokenHash) return;
        setAVerificar(true);
        await verificarTokenEmail(tokenHash);
        router.replace({
          pathname: '/(auth)/email-confirmed' as never,
          params: { email },
        });
      } catch {
        setAVerificar(false);
      }
    },
    [email],
  );

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    return () => sub.remove();
  }, [handleUrl]);

  async function handleReenviar() {
    if (cooldown > 0 || aReenviar) return;
    setErroReenvio(null);
    setReenviadoSucesso(false);
    setAReenviar(true);
    try {
      await reenviarEmailVerificacao(email);
      setReenviadoSucesso(true);
      setCooldown(60);
    } catch {
      setErroReenvio(t('auth.emailVerification.erroReenvio'));
    } finally {
      setAReenviar(false);
    }
  }

  if (aVerificar) {
    return (
      <SafeAreaView style={estilos.safe}>
        <View style={estilos.loadingWrap}>
          <ActivityIndicator size="large" color="#1A6FAF" />
          <Text style={estilos.loadingTxt}>{t('auth.emailVerification.aVerificar')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.safe} edges={['top']}>
      {/* Cabeçalho */}
      <View style={estilos.header}>
        <Text style={estilos.headerTitulo}>{t('auth.emailVerification.headerTitulo')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={estilos.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Indicador de progresso */}
        <View style={estilos.progresso}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[estilos.progPonto, estilos.progPontoConcluido]} />
          ))}
          <Animated.View style={[estilos.progPilula, { width: larguraAtiva }]} />
        </View>

        {/* Ícone de email */}
        <View style={estilos.iconCircle}>
          <Mail size={38} color="#1A6FAF" />
        </View>

        <Text style={estilos.titulo}>{t('auth.emailVerification.titulo')}</Text>

        <Text style={estilos.subtitulo}>
          {t('auth.emailVerification.subtitulo')}
        </Text>

        {/* Chip com email mascarado */}
        <View style={estilos.emailChip}>
          <Text style={estilos.emailChipTxt}>{mascarEmail(email)}</Text>
        </View>

        {reenviadoSucesso && (
          <Text style={estilos.feedbackOk}>{t('auth.emailVerification.reenviadoSucesso')}</Text>
        )}
        {erroReenvio && (
          <Text style={estilos.feedbackErro}>{erroReenvio}</Text>
        )}

        {/* Botão reenviar */}
        <TouchableOpacity
          style={[estilos.btnPrimario, (aReenviar || cooldown > 0) && estilos.btnDisabled]}
          onPress={handleReenviar}
          disabled={aReenviar || cooldown > 0}
          activeOpacity={0.85}
        >
          {aReenviar ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <RefreshCw size={16} color="#FFFFFF" />
              <Text style={estilos.btnPrimarioTxt}>
                {cooldown > 0 ? t('auth.emailVerification.reenviarEmailCooldown', { segundos: cooldown }) : t('auth.emailVerification.reenviarEmail')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Fallback para quando o link não redireciona para a app */}
        <TouchableOpacity
          style={estilos.jaConfirmeiRow}
          onPress={() => router.replace('/(auth)/login' as never)}
          activeOpacity={0.7}
        >
          <CheckCircle size={14} color="#1D9E75" style={{ flexShrink: 0 }} />
          <Text style={estilos.jaConfirmeiTxt}>{t('auth.emailVerification.jaConfirmastePergunta')}<Text style={estilos.jaConfirmeiLink}>{t('auth.emailVerification.jaConfirmasteLink')}</Text></Text>
        </TouchableOpacity>

        {/* Dica sobre spam */}
        <View style={estilos.hintRow}>
          <View style={estilos.hintIconCircle}>
            <Lightbulb size={12} color="#F59E0B" />
          </View>
          <Text style={estilos.hintTxt}>
            {t('auth.emailVerification.dicaSpam')}
          </Text>
        </View>

        {/* Contagem regressiva de expiração */}
        <Text style={estilos.expiraTxt}>
          {t('auth.emailVerification.expiraEm')}
          <Text style={{ color: '#1A6FAF' }}>{formatarContagem(segundosRestantes)}</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const estilos = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    backgroundColor: '#1A6FAF',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitulo: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },

  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
  },

  // Indicador de progresso
  progresso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 40,
  },
  progPonto: { width: 10, height: 10, borderRadius: 5 },
  progPontoConcluido: { backgroundColor: '#1D9E75' },
  progPilula: { height: 10, borderRadius: 5, backgroundColor: '#1A6FAF' },

  // Ícone central
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
    fontWeight: '500',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitulo: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
    marginBottom: 20,
  },

  // Chip de email
  emailChip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  emailChipTxt: { fontSize: 12, color: '#0C447C', fontWeight: '500' },

  feedbackOk: { fontSize: 12, color: '#1D9E75', marginBottom: 10, textAlign: 'center' },
  feedbackErro: { fontSize: 12, color: '#EF4444', marginBottom: 10, textAlign: 'center' },

  // Botões
  btnPrimario: {
    backgroundColor: '#1A6FAF',
    borderRadius: 11,
    height: 46,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimarioTxt: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },

  // Dica de spam
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 28,
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

  jaConfirmeiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  jaConfirmeiTxt: { fontSize: 13, color: '#1D9E75' },
  jaConfirmeiLink: { fontSize: 13, color: '#1D9E75', fontWeight: '700' },

  expiraTxt: { fontSize: 11, color: '#9CA3AF', marginTop: 18, textAlign: 'center' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingTxt: { fontSize: 14, color: '#6B7280' },
});
