import React, { useState } from 'react';
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

// ─── Componente auxiliar de campo ────────────────────────────────────────────

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

// ─── Ecrã de sucesso ──────────────────────────────────────────────────────────

function EcraSucesso({ email }: { email: string }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.sucessoWrap}>
        <View style={styles.sucessoIcon}>
          <Check size={38} color="#FFFFFF" />
        </View>
        <Text style={styles.sucessoTitulo}>Conta criada!</Text>
        <Text style={styles.sucessoDesc}>
          Foi enviado um email de confirmação para{' '}
          <Text style={{ fontWeight: '700' }}>{email}</Text>.{'\n\n'}
          Após confirmar o email, a sua conta será ativada pelo técnico responsável antes de poder
          aceder a todos os serviços.
        </Text>
        <TouchableOpacity
          style={styles.btnSucesso}
          onPress={() => router.replace('/(auth)/login' as never)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSucessoTxt}>Ir para o início de sessão</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Ecrã principal ───────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [dataNasc, setDataNasc] = useState('');
  const [genero, setGenero] = useState<Genero | null>(null);
  const [cartaoCidadao, setCartaoCidadao] = useState('');
  const [numeroUtente, setNumeroUtente] = useState('');
  const [contacto, setContacto] = useState('');
  const [morada, setMorada] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPw, setConfirmarPw] = useState('');
  const [pwVisivel, setPwVisivel] = useState(false);
  const [confirmarPwVisivel, setConfirmarPwVisivel] = useState(false);
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const forca = avaliarForca(password);

  if (sucesso) return <EcraSucesso email={email} />;

  async function handleRegistar() {
    setErro(null);
    if (!nome.trim()) return setErro('O nome completo é obrigatório.');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setErro('Introduza um email válido.');
    if (!validarDataNasc(dataNasc))
      return setErro('Data de nascimento inválida. Use o formato DD/MM/AAAA.');
    if (!genero) return setErro('Selecione o sexo.');
    if (!cartaoCidadao.trim()) return setErro('O Cartão de Cidadão é obrigatório.');
    if (!contacto.trim()) return setErro('O contacto é obrigatório.');
    if (!morada.trim()) return setErro('A morada é obrigatória.');
    if (forca.pontos < 4)
      return setErro('A password não cumpre todos os critérios de segurança.');
    if (password !== confirmarPw) return setErro('As passwords não coincidem.');

    setACarregar(true);
    try {
      const resultado = await registar({
        email: email.trim().toLowerCase(),
        password,
        nomeCompleto: nome.trim(),
        dataNascimento: dataParaIso(dataNasc),
        genero,
        cartaoCidadao: cartaoCidadao.trim(),
        numeroUtente: numeroUtente.trim() || null,
        contacto: contacto.trim(),
        morada: morada.trim(),
      });

      if (resultado.needsEmailConfirmation) {
        setSucesso(true);
      } else {
        router.replace('/(tabs)/home' as never);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      setErro(traduzirErro(msg));
    } finally {
      setACarregar(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.btnVoltar}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={24} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Criar conta</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Dados pessoais ───────────────────────────── */}
          <Text style={styles.seccaoTitulo}>Dados pessoais</Text>

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
                  <Text style={[styles.generoBtnTxt, genero === g.key && styles.generoBtnTxtAtivo]}>
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

          {/* ── Contacto ─────────────────────────────────── */}
          <Text style={[styles.seccaoTitulo, { marginTop: 8 }]}>Contacto</Text>

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

          {/* ── Acesso ───────────────────────────────────── */}
          <Text style={[styles.seccaoTitulo, { marginTop: 8 }]}>Acesso</Text>

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
                    <Text style={[styles.forcaLabel, { color: forca.cor }]}>{forca.label}</Text>
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

          {erro && (
            <View style={styles.erroBox}>
              <Text style={styles.erroTxt}>{erro}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btnRegistar, aCarregar && styles.btnDisabled]}
            onPress={handleRegistar}
            disabled={aCarregar}
            activeOpacity={0.85}
          >
            {aCarregar
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.btnRegistarTxt}>Criar conta</Text>
            }
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },

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

  scroll: { padding: 20 },

  seccaoTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A6FAF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
    marginTop: 4,
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

  forcaWrap: { marginTop: 10 },
  forcaBars: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  forcaBar: { flex: 1, height: 5, borderRadius: 3 },
  forcaLabel: { fontSize: 12, fontWeight: '700', minWidth: 48 },
  criteriosList: { gap: 5 },
  criterioRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  criterioTxt: { fontSize: 12, color: '#9CA3AF' },
  criterioOk: { color: '#1D9E75' },
  pwErroTxt: { fontSize: 12, color: '#EF4444', marginTop: 6 },

  erroBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  erroTxt: { color: '#EF4444', fontSize: 13, textAlign: 'center' },

  btnRegistar: {
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
  btnDisabled: { opacity: 0.65 },
  btnRegistarTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  sucessoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  sucessoIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1D9E75',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  sucessoTitulo: { fontSize: 28, fontWeight: '800', color: '#1A1A2E', marginBottom: 16 },
  sucessoDesc: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
  },
  btnSucesso: {
    backgroundColor: '#1A6FAF',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A6FAF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnSucessoTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
