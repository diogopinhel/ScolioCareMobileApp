import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Check, X } from 'lucide-react-native';
import { registar } from '../../src/data/repository/auth';

// ─── Password strength ────────────────────────────────────────────────────────

interface ForcaInfo {
  pontos: number;
  label: string;
  cor: string;
  criterios: { label: string; ok: boolean }[];
}

function avaliarForca(pw: string): ForcaInfo {
  const criterios = [
    { label: 'Pelo menos 8 caracteres', ok: pw.length >= 8 },
    { label: 'Uma letra maiúscula', ok: /[A-Z]/.test(pw) },
    { label: 'Um número', ok: /[0-9]/.test(pw) },
    { label: 'Um símbolo (!@#$...)', ok: /[^A-Za-z0-9]/.test(pw) },
  ];
  const pontos = criterios.filter((c) => c.ok).length;
  const map: Record<number, { label: string; cor: string }> = {
    0: { label: '', cor: '#E5E7EB' },
    1: { label: 'Fraca', cor: '#EF4444' },
    2: { label: 'Média', cor: '#F59E0B' },
    3: { label: 'Boa', cor: '#1A6FAF' },
    4: { label: 'Forte', cor: '#1D9E75' },
  };
  return { pontos, criterios, ...map[pontos] };
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Genero = 'M' | 'F' | 'O';
const GENEROS: { key: Genero; label: string }[] = [
  { key: 'M', label: 'Masculino' },
  { key: 'F', label: 'Feminino' },
  { key: 'O', label: 'Outro' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarDataNasc(texto: string): string {
  const nums = texto.replace(/\D/g, '').slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
}

function validarDataNasc(data: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) return false;
  const [d, m, y] = data.split('/').map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d &&
    y >= 1900 &&
    y <= new Date().getFullYear()
  );
}

function dataParaIso(data: string): string {
  const [d, m, y] = data.split('/');
  return `${y}-${m}-${d}`;
}

function traduzirErro(msg: string): string {
  if (msg.includes('already registered') || msg.includes('User already registered'))
    return 'Este email já tem uma conta registada.';
  if (msg.includes('invalid email') || msg.includes('Invalid email'))
    return 'Introduza um email válido.';
  if (msg.includes('Password should') || msg.includes('weak_password'))
    return 'A password é demasiado fraca.';
  if (msg.includes('rate limit') || msg.includes('Too many'))
    return 'Demasiadas tentativas. Aguarde alguns minutos.';
  return 'Ocorreu um erro ao criar a conta. Tente novamente.';
}

// ─── Componente de campo ──────────────────────────────────────────────────────

function Campo({
  label,
  obrigatorio,
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>
        {label}
        {obrigatorio && <Text style={{ color: '#EF4444' }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

// ─── Ecrã principal ───────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);

  // Dados pessoais
  const [nome, setNome] = useState('');
  const [dataNasc, setDataNasc] = useState('');
  const [genero, setGenero] = useState<Genero | null>(null);
  const [cartaoCidadao, setCartaoCidadao] = useState('');
  const [numeroUtente, setNumeroUtente] = useState('');

  // Contacto
  const [contacto, setContacto] = useState('');
  const [morada, setMorada] = useState('');

  // Acesso
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPw, setConfirmarPw] = useState('');
  const [pwVisivel, setPwVisivel] = useState(false);
  const [confirmarPwVisivel, setConfirmarPwVisivel] = useState(false);

  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const larguraAtiva = useRef(new Animated.Value(10)).current;

  // Animar o dot ativo sempre que a etapa muda
  useEffect(() => {
    larguraAtiva.setValue(10);
    Animated.spring(larguraAtiva, {
      toValue: 28,
      useNativeDriver: false,
      damping: 12,
      stiffness: 120,
    }).start();
  }, [etapa, larguraAtiva]);

  const forca = avaliarForca(password);

  // ─── Validações por etapa ──────────────────────────────────────────────────

  function validarEtapa1(): string | null {
    if (!nome.trim()) return 'O nome completo é obrigatório.';
    if (!validarDataNasc(dataNasc))
      return 'Data de nascimento inválida. Use o formato DD/MM/AAAA.';
    if (!genero) return 'Selecione o sexo.';
    if (!cartaoCidadao.trim()) return 'O Cartão de Cidadão é obrigatório.';
    return null;
  }

  function validarEtapa2(): string | null {
    if (!contacto.trim()) return 'O contacto é obrigatório.';
    if (!morada.trim()) return 'A morada é obrigatória.';
    return null;
  }

  function avancar() {
    setErro(null);
    const erroAtual = etapa === 1 ? validarEtapa1() : validarEtapa2();
    if (erroAtual) return setErro(erroAtual);
    setEtapa((p) => (p + 1) as 1 | 2 | 3);
  }

  function recuar() {
    setErro(null);
    if (etapa === 1) router.back();
    else setEtapa((p) => (p - 1) as 1 | 2 | 3);
  }

  // ─── Submissão final ───────────────────────────────────────────────────────

  async function handleRegistar() {
    setErro(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setErro('Introduza um email válido.');
    if (forca.pontos < 4)
      return setErro('A password não cumpre todos os critérios de segurança.');
    if (password !== confirmarPw) return setErro('As passwords não coincidem.');

    setACarregar(true);
    let needsConfirmation = false;
    try {
      const resultado = await registar({
        email: email.trim().toLowerCase(),
        password,
        nomeCompleto: nome.trim(),
        dataNascimento: dataParaIso(dataNasc),
        genero: genero!,
        cartaoCidadao: cartaoCidadao.trim(),
        numeroUtente: numeroUtente.trim() || null,
        contacto: contacto.trim(),
        morada: morada.trim(),
      });
      needsConfirmation = resultado.needsEmailConfirmation;
    } catch (e: unknown) {
      console.log('[Register] erro ao criar conta:', e);
      const msg = e instanceof Error ? e.message : '';
      setErro(traduzirErro(msg));
      setACarregar(false);
      return;
    }
    setACarregar(false);

    // Navegação fora do try/catch para não confundir erros de routing com erros de conta
    if (needsConfirmation) {
      const encodedEmail = encodeURIComponent(email.trim().toLowerCase());
      router.replace(`/(auth)/email-verification?email=${encodedEmail}` as never);
    } else {
      router.replace('/(tabs)/home' as never);
    }
  }

  // ─── Metadados de cada etapa ───────────────────────────────────────────────

  const metaEtapa = [
    { titulo: 'Dados pessoais', descricao: 'Introduz os teus dados de identificação.' },
    { titulo: 'Contacto', descricao: 'Como podemos contactar-te?' },
    { titulo: 'Acesso', descricao: 'Define as credenciais de acesso à conta.' },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Cabeçalho azul */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={recuar}
          style={styles.btnVoltar}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>{metaEtapa[etapa - 1].titulo}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Indicador de progresso */}
          <View style={styles.progresso}>
            {[0, 1, 2, 3].map((i) => {
              const idx = etapa - 1;
              if (i < idx)
                return <View key={i} style={[styles.progPonto, styles.progConcluido]} />;
              if (i === idx)
                return (
                  <Animated.View key={i} style={[styles.progPilula, { width: larguraAtiva }]} />
                );
              return <View key={i} style={[styles.progPonto, styles.progInativo]} />;
            })}
          </View>

          {/* Descrição da etapa */}
          <Text style={styles.etapaDesc}>{metaEtapa[etapa - 1].descricao}</Text>

          {/* ── Etapa 1: Dados pessoais ─────────────────────── */}
          {etapa === 1 && (
            <>
              <Campo label="Nome completo" obrigatorio>
                <TextInput
                  style={styles.input}
                  value={nome}
                  onChangeText={(v) => { setNome(v); setErro(null); }}
                  placeholder="Maria da Silva"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </Campo>

              <Campo label="Data de nascimento" obrigatorio>
                <TextInput
                  style={styles.input}
                  value={dataNasc}
                  onChangeText={(v) => { setDataNasc(formatarDataNasc(v)); setErro(null); }}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </Campo>

              <Campo label="Sexo" obrigatorio>
                <View style={styles.generoRow}>
                  {GENEROS.map((g) => (
                    <TouchableOpacity
                      key={g.key}
                      style={[styles.generoBtn, genero === g.key && styles.generoBtnAtivo]}
                      onPress={() => { setGenero(g.key); setErro(null); }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.generoBtnTxt,
                          genero === g.key && styles.generoBtnTxtAtivo,
                        ]}
                      >
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Campo>

              <Campo label="Nº Cartão de Cidadão" obrigatorio>
                <TextInput
                  style={styles.input}
                  value={cartaoCidadao}
                  onChangeText={(v) => { setCartaoCidadao(v); setErro(null); }}
                  placeholder="12345678 0ZZ4"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                />
              </Campo>

              <Campo label="Nº de Utente SNS">
                <TextInput
                  style={styles.input}
                  value={numeroUtente}
                  onChangeText={(v) => { setNumeroUtente(v); setErro(null); }}
                  placeholder="123456789"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </Campo>
            </>
          )}

          {/* ── Etapa 2: Contacto ───────────────────────────── */}
          {etapa === 2 && (
            <>
              <Campo label="Telemóvel" obrigatorio>
                <TextInput
                  style={styles.input}
                  value={contacto}
                  onChangeText={(v) => { setContacto(v); setErro(null); }}
                  placeholder="912 345 678"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </Campo>

              <Campo label="Morada" obrigatorio>
                <TextInput
                  style={styles.input}
                  value={morada}
                  onChangeText={(v) => { setMorada(v); setErro(null); }}
                  placeholder="Rua Exemplo, nº 1, 5000-000 Vila Real"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
              </Campo>
            </>
          )}

          {/* ── Etapa 3: Acesso ─────────────────────────────── */}
          {etapa === 3 && (
            <>
              <Campo label="Email" obrigatorio>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setErro(null); }}
                  placeholder="exemplo@email.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </Campo>

              <Campo label="Password" obrigatorio>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.inputFlex}
                    value={password}
                    onChangeText={(v) => { setPassword(v); setErro(null); }}
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!pwVisivel}
                  />
                  <TouchableOpacity
                    onPress={() => setPwVisivel((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.eyeTxt}>{pwVisivel ? 'Ocultar' : 'Ver'}</Text>
                  </TouchableOpacity>
                </View>

                {password.length > 0 && (
                  <View style={styles.forcaWrap}>
                    <View style={styles.forcaBars}>
                      {[1, 2, 3, 4].map((n) => (
                        <View
                          key={n}
                          style={[
                            styles.forcaBar,
                            { backgroundColor: n <= forca.pontos ? forca.cor : '#E5E7EB' },
                          ]}
                        />
                      ))}
                      {forca.label ? (
                        <Text style={[styles.forcaLabel, { color: forca.cor }]}>
                          {forca.label}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.criteriosList}>
                      {forca.criterios.map((c) => (
                        <View key={c.label} style={styles.criterioRow}>
                          {c.ok
                            ? <Check size={12} color="#1D9E75" />
                            : <X size={12} color="#9CA3AF" />
                          }
                          <Text style={[styles.criterioTxt, c.ok && styles.criterioOk]}>
                            {c.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </Campo>

              <Campo label="Confirmar password" obrigatorio>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.inputFlex}
                    value={confirmarPw}
                    onChangeText={(v) => { setConfirmarPw(v); setErro(null); }}
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!confirmarPwVisivel}
                  />
                  <TouchableOpacity
                    onPress={() => setConfirmarPwVisivel((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.eyeTxt}>{confirmarPwVisivel ? 'Ocultar' : 'Ver'}</Text>
                  </TouchableOpacity>
                </View>
                {confirmarPw.length > 0 && password !== confirmarPw && (
                  <Text style={styles.pwErroTxt}>As passwords não coincidem.</Text>
                )}
              </Campo>
            </>
          )}

          {/* Erro */}
          {erro && (
            <View style={styles.erroBox}>
              <Text style={styles.erroTxt}>{erro}</Text>
            </View>
          )}

          {/* Botão de ação */}
          <TouchableOpacity
            style={[styles.btnPrimario, aCarregar && styles.btnDisabled]}
            onPress={etapa < 3 ? avancar : handleRegistar}
            disabled={aCarregar}
            activeOpacity={0.85}
          >
            {aCarregar ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnPrimarioTxt}>
                {etapa < 3 ? 'Continuar' : 'Criar conta'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },

  // Cabeçalho azul
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 52,
    backgroundColor: '#1A6FAF',
  },
  btnVoltar: { width: 40, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitulo: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },

  scroll: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 16 },

  // Indicador de progresso
  progresso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    alignSelf: 'center',
  },
  progPonto: { width: 10, height: 10, borderRadius: 5 },
  progConcluido: { backgroundColor: '#1D9E75' },
  progInativo: { backgroundColor: '#E5E7EB' },
  progPilula: { height: 10, borderRadius: 5, backgroundColor: '#1A6FAF' },

  etapaDesc: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
  },

  // Campos
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
  eyeTxt: { fontSize: 13, color: '#1A6FAF', fontWeight: '500', paddingLeft: 8 },

  // Selector de género
  generoRow: { flexDirection: 'row', gap: 10 },
  generoBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  generoBtnAtivo: { borderColor: '#1A6FAF', backgroundColor: '#EFF6FF' },
  generoBtnTxt: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  generoBtnTxtAtivo: { color: '#1A6FAF', fontWeight: '700' },

  // Força da password
  forcaWrap: { marginTop: 10 },
  forcaBars: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  forcaBar: { flex: 1, height: 5, borderRadius: 3 },
  forcaLabel: { fontSize: 12, fontWeight: '700', minWidth: 48 },
  criteriosList: { gap: 5 },
  criterioRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  criterioTxt: { fontSize: 12, color: '#9CA3AF' },
  criterioOk: { color: '#1D9E75' },
  pwErroTxt: { fontSize: 12, color: '#EF4444', marginTop: 6 },

  // Feedback
  erroBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  erroTxt: { color: '#EF4444', fontSize: 13, textAlign: 'center' },

  // Botão principal
  btnPrimario: {
    backgroundColor: '#1A6FAF',
    borderRadius: 11,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#1A6FAF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnDisabled: { opacity: 0.65 },
  btnPrimarioTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

});
