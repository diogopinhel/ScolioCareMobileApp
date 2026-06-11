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
import { ArrowLeft, CheckCircle, Mail } from 'lucide-react-native';
import {
  enviarEmailRecuperacaoPassword,
  definirNovaPassword,
} from '../../src/data/repository/auth';

const REGEX_EMAIL = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function RecuperarPasswordScreen() {
  const [passo, setPasso] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaPassword, setNovaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [aProcessar, setAProcessar] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarNova, setMostrarNova] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [reenviadoAviso, setReenviadoAviso] = useState(false);

  async function handleEnviarCodigo() {
    const emailTrimmed = email.trim().toLowerCase();
    if (!REGEX_EMAIL.test(emailTrimmed)) {
      setErro('Introduza um endereço de email válido.');
      return;
    }
    setErro(null);
    setAProcessar(true);
    try {
      await enviarEmailRecuperacaoPassword(emailTrimmed);
      setPasso(2);
    } catch {
      // Mostrar sempre sucesso para não revelar se o email existe
      setPasso(2);
    } finally {
      setAProcessar(false);
    }
  }

  async function handleReenviar() {
    setErro(null);
    setReenviadoAviso(false);
    try {
      await enviarEmailRecuperacaoPassword(email.trim().toLowerCase());
      setReenviadoAviso(true);
    } catch {
      setReenviadoAviso(true);
    }
  }

  function validarPasso2(): string | null {
    if (codigo.trim().length !== 6) return 'O código deve ter 6 dígitos.';
    if (novaPassword.length < 8)
      return 'A palavra-passe deve ter pelo menos 8 caracteres.';
    if (!/[A-Z]/.test(novaPassword))
      return 'A palavra-passe deve conter pelo menos uma letra maiúscula.';
    if (!/[0-9]/.test(novaPassword))
      return 'A palavra-passe deve conter pelo menos um número.';
    if (novaPassword !== confirmarPassword)
      return 'As palavras-passe não coincidem.';
    return null;
  }

  async function handleGuardar() {
    const erroValidacao = validarPasso2();
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }
    setErro(null);
    setAProcessar(true);
    try {
      await definirNovaPassword(
        email.trim().toLowerCase(),
        codigo.trim(),
        novaPassword,
      );
      setSucesso(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message.toLowerCase() : '';
      if (msg.includes('expired') || msg.includes('invalid') || msg.includes('otp')) {
        setErro('Código inválido ou expirado. Solicite um novo código.');
      } else {
        setErro('Não foi possível alterar a palavra-passe. Tente novamente.');
      }
    } finally {
      setAProcessar(false);
    }
  }

  // ── Ecrã de sucesso ──────────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <SafeAreaView style={estilos.safe} edges={['top']}>
        <View style={estilos.header}>
          <Text style={estilos.headerTitulo}>Recuperar palavra-passe</Text>
        </View>
        <ScrollView
          contentContainerStyle={estilos.scrollCentrado}
          showsVerticalScrollIndicator={false}
        >
          <View style={estilos.iconCircle}>
            <CheckCircle size={38} color="#1D9E75" />
          </View>
          <Text style={estilos.titulo}>Palavra-passe alterada!</Text>
          <Text style={estilos.subtitulo}>
            A sua palavra-passe foi redefinida com sucesso. Já pode iniciar
            sessão com a nova palavra-passe.
          </Text>
          <TouchableOpacity
            style={estilos.btnPrimario}
            onPress={() => router.replace('/(auth)/login' as never)}
            activeOpacity={0.85}
          >
            <Text style={estilos.btnPrimarioTxt}>Ir para o início de sessão</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Passo 1 — Email ──────────────────────────────────────────────────────────
  if (passo === 1) {
    return (
      <SafeAreaView style={estilos.safe} edges={['top']}>
        <View style={estilos.header}>
          <TouchableOpacity
            style={estilos.voltarBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={estilos.headerTitulo}>Recuperar palavra-passe</Text>
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
            <View style={estilos.passoIndicador}>
              <View style={[estilos.passoPonto, estilos.passoAtivo]} />
              <View style={estilos.passoLinha} />
              <View style={estilos.passoPonto} />
            </View>

            <Text style={estilos.instrucao}>
              Introduza o email associado à sua conta. Enviaremos um código de
              6 dígitos para redefinir a palavra-passe.
            </Text>

            <View style={estilos.campo}>
              <Text style={estilos.label}>Email</Text>
              <TextInput
                style={estilos.input}
                value={email}
                onChangeText={(v) => { setEmail(v); setErro(null); }}
                placeholder="exemplo@email.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="send"
                onSubmitEditing={handleEnviarCodigo}
                editable={!aProcessar}
              />
            </View>

            {erro && (
              <View style={estilos.erroContainer}>
                <Text style={estilos.erroTexto}>{erro}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[estilos.btnPrimario, aProcessar && estilos.btnDisabled]}
              onPress={handleEnviarCodigo}
              disabled={aProcessar}
              activeOpacity={0.85}
            >
              {aProcessar ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={estilos.btnPrimarioTxt}>Enviar código</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={estilos.voltarLogin}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={estilos.voltarLoginTxt}>Voltar ao início de sessão</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Passo 2 — Código + Nova password ─────────────────────────────────────────
  return (
    <SafeAreaView style={estilos.safe} edges={['top']}>
      <View style={estilos.header}>
        <TouchableOpacity
          style={estilos.voltarBtn}
          onPress={() => { setPasso(1); setErro(null); setCodigo(''); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={estilos.headerTitulo}>Recuperar palavra-passe</Text>
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
          <View style={estilos.passoIndicador}>
            <View style={[estilos.passoPonto, estilos.passoConcluido]} />
            <View style={[estilos.passoLinha, estilos.passoLinhaConcluida]} />
            <View style={[estilos.passoPonto, estilos.passoAtivo]} />
          </View>

          <View style={estilos.emailBadge}>
            <Mail size={14} color="#1A6FAF" />
            <Text style={estilos.emailBadgeTxt} numberOfLines={1}>
              Código enviado para {email.trim()}
            </Text>
          </View>

          <View style={estilos.campo}>
            <Text style={estilos.label}>Código de verificação</Text>
            <TextInput
              style={[estilos.input, estilos.inputCodigo]}
              value={codigo}
              onChangeText={(v) => { setCodigo(v.replace(/\D/g, '')); setErro(null); }}
              placeholder="000000"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={6}
              editable={!aProcessar}
            />
          </View>

          <View style={estilos.campo}>
            <Text style={estilos.label}>Nova palavra-passe</Text>
            <View style={estilos.inputRow}>
              <TextInput
                style={estilos.inputFlex}
                value={novaPassword}
                onChangeText={(v) => { setNovaPassword(v); setErro(null); }}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!mostrarNova}
                returnKeyType="next"
                editable={!aProcessar}
              />
              <TouchableOpacity
                onPress={() => setMostrarNova((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={estilos.eyeTxt}>{mostrarNova ? 'Ocultar' : 'Ver'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={estilos.dica}>Mínimo 8 caracteres, 1 maiúscula e 1 número</Text>
          </View>

          <View style={estilos.campo}>
            <Text style={estilos.label}>Confirmar palavra-passe</Text>
            <View style={estilos.inputRow}>
              <TextInput
                style={estilos.inputFlex}
                value={confirmarPassword}
                onChangeText={(v) => { setConfirmarPassword(v); setErro(null); }}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!mostrarConfirmar}
                returnKeyType="done"
                onSubmitEditing={handleGuardar}
                editable={!aProcessar}
              />
              <TouchableOpacity
                onPress={() => setMostrarConfirmar((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={estilos.eyeTxt}>
                  {mostrarConfirmar ? 'Ocultar' : 'Ver'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {erro && (
            <View style={estilos.erroContainer}>
              <Text style={estilos.erroTexto}>{erro}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[estilos.btnPrimario, aProcessar && estilos.btnDisabled]}
            onPress={handleGuardar}
            disabled={aProcessar}
            activeOpacity={0.85}
          >
            {aProcessar ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={estilos.btnPrimarioTxt}>Guardar palavra-passe</Text>
            )}
          </TouchableOpacity>

          <View style={estilos.reenviarWrap}>
            <Text style={estilos.reenviarTxt}>Não recebeu o código? </Text>
            <TouchableOpacity onPress={handleReenviar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={estilos.reenviarLink}>Reenviar</Text>
            </TouchableOpacity>
          </View>
          {reenviadoAviso && (
            <Text style={estilos.reenviadoAviso}>Novo código enviado.</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },

  header: {
    backgroundColor: '#1A6FAF',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  voltarBtn: { marginRight: 12 },
  headerTitulo: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  scrollCentrado: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 48,
  },

  // ── Indicador de passo ───────────────────────────────────────────────────────
  passoIndicador: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  passoPonto: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  passoAtivo: { backgroundColor: '#1A6FAF' },
  passoConcluido: { backgroundColor: '#1D9E75' },
  passoLinha: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 6,
  },
  passoLinhaConcluida: { backgroundColor: '#1D9E75' },

  instrucao: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 28,
  },

  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  emailBadgeTxt: {
    fontSize: 13,
    color: '#1A6FAF',
    fontWeight: '500',
    flex: 1,
  },

  campo: { marginBottom: 16 },
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
  inputCodigo: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
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
  eyeTxt: { fontSize: 13, color: '#1A6FAF', fontWeight: '500' },
  dica: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },

  erroContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  erroTexto: { color: '#EF4444', fontSize: 13, textAlign: 'center' },

  btnPrimario: {
    backgroundColor: '#1A6FAF',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    width: '100%',
    shadowColor: '#1A6FAF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimarioTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.65 },

  voltarLogin: { marginTop: 28, alignItems: 'center' },
  voltarLoginTxt: { fontSize: 14, color: '#1A6FAF', fontWeight: '600' },

  reenviarWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  reenviarTxt: { fontSize: 13, color: '#6B7280' },
  reenviarLink: { fontSize: 13, color: '#1A6FAF', fontWeight: '600' },
  reenviadoAviso: {
    fontSize: 12,
    color: '#1D9E75',
    textAlign: 'center',
    marginTop: 6,
  },

  // ── Sucesso ──────────────────────────────────────────────────────────────────
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ECFDF5',
    borderWidth: 3,
    borderColor: '#1D9E75',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 300,
  },
});
