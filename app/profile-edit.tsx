import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  User,
  CalendarDays,
  Users,
  Phone,
  MapPin,
  Mail,
  CreditCard,
  FileText,
  Lock,
  ChevronDown,
} from 'lucide-react-native';
import { useAuth } from '../src/context/AuthContext';
import {
  getEmailDoPaciente,
  atualizarPerfilPaciente,
} from '../src/data/repository/perfil';
import { useTranslation } from '../src/i18n';

// ─── Tipos e constantes ───────────────────────────────────────────────────────

type Genero = 'M' | 'F' | 'O';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function iniciaisNome(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function normalizeGenero(g: string | null | undefined): Genero | null {
  if (!g) return null;
  const map: Record<string, Genero> = {
    M: 'M', masculino: 'M', Masculino: 'M',
    F: 'F', feminino: 'F', Feminino: 'F',
    O: 'O', outro: 'O', Outro: 'O',
  };
  return map[g] ?? null;
}

function isoParaDisplay(iso: string | null): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return '';
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function dataParaIso(data: string): string {
  const [d, m, y] = data.split('/');
  return `${y}-${m}-${d}`;
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

function formatarDataNasc(texto: string): string {
  const nums = texto.replace(/\D/g, '').slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Separador() {
  return <View style={s.sep} />;
}

// ─── Ecrã principal ───────────────────────────────────────────────────────────

export default function ProfileEditScreen() {
  const { utilizador, refreshUtilizador } = useAuth();
  const { t } = useTranslation();

  const GENEROS: { key: Genero; label: string }[] = [
    { key: 'M', label: t('perfilEdit.generoMasculino') },
    { key: 'F', label: t('perfilEdit.generoFeminino') },
    { key: 'O', label: t('perfilEdit.generoOutro') },
  ];

  const [nome, setNome] = useState(utilizador?.nome_completo ?? '');
  const [dataNasc, setDataNasc] = useState(isoParaDisplay(utilizador?.data_nascimento ?? null));
  const [genero, setGenero] = useState<Genero | null>(normalizeGenero(utilizador?.genero));
  const [contacto, setContacto] = useState(utilizador?.contacto ?? '');
  const [morada, setMorada] = useState(utilizador?.morada ?? '');
  const [email, setEmail] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    getEmailDoPaciente().then(setEmail);
  }, []);

  async function guardar() {
    if (!utilizador) return;
    setErro(null);

    if (!nome.trim()) return setErro(t('perfilEdit.erroNomeObrigatorio'));
    if (nome.trim().length < 3) return setErro(t('perfilEdit.erroNomeMinimo'));
    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nome.trim())) return setErro(t('perfilEdit.erroNomeLetras'));
    if (dataNasc && !validarDataNasc(dataNasc))
      return setErro(t('perfilEdit.erroDataInvalida'));
    if (!contacto.trim()) return setErro(t('perfilEdit.erroTelemovelObrigatorio'));
    const digitosContacto = contacto.replace(/\D/g, '');
    if (digitosContacto.length < 7 || digitosContacto.length > 15)
      return setErro(t('perfilEdit.erroTelefoneInvalido'));
    if (!/^\+?[\d\s\-().]+$/.test(contacto.trim()))
      return setErro(t('perfilEdit.erroTelefoneCaracteres'));
    if (!morada.trim()) return setErro(t('perfilEdit.erroMoradaObrigatoria'));
    if (morada.trim().length < 10) return setErro(t('perfilEdit.erroMoradaMinima'));

    setACarregar(true);
    try {
      await atualizarPerfilPaciente(utilizador.id, {
        nome_completo: nome.trim(),
        data_nascimento: dataNasc ? dataParaIso(dataNasc) : null,
        genero,
        contacto: contacto.trim(),
        morada: morada.trim(),
      });
      await refreshUtilizador();
      router.back();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : t('perfilEdit.erroGuardar'));
    } finally {
      setACarregar(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header azul ────────────────────────────────── */}
          <View style={s.headerAzul}>
            <View style={s.headerRow}>
              <TouchableOpacity
                style={s.btnVoltar}
                onPress={() => router.back()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ChevronLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={s.headerTitulo}>{t('perfilEdit.titulo')}</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={s.avatarWrap}>
              <View style={s.avatarCirculo}>
                <Text style={s.avatarTxt}>
                  {iniciaisNome(utilizador?.nome_completo ?? '??')}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Conteúdo ─────────────────────────────────── */}
          <View style={s.conteudo}>

            {/* ── DADOS PESSOAIS ──────────────────────── */}
            <Text style={s.seccaoLabel}>{t('perfilEdit.seccaoDadosPessoais')}</Text>
            <View style={s.card}>
              {/* Nome completo */}
              <View style={s.campo}>
                <Text style={s.campoLabel}>
                  {t('perfilEdit.nomeCompleto')} <Text style={s.obrig}>*</Text>
                </Text>
                <View style={s.inputWrap}>
                  <User size={16} color="#9CA3AF" />
                  <TextInput
                    style={s.input}
                    value={nome}
                    onChangeText={(v) => { setNome(v); setErro(null); }}
                    placeholder={t('perfilEdit.nomePlaceholder')}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    maxLength={100}
                  />
                </View>
              </View>

              <Separador />

              {/* Data de nascimento */}
              <View style={s.campo}>
                <Text style={s.campoLabel}>{t('perfilEdit.dataNascimento')}</Text>
                <View style={s.inputWrap}>
                  <CalendarDays size={16} color="#9CA3AF" />
                  <TextInput
                    style={s.input}
                    value={dataNasc}
                    onChangeText={(v) => { setDataNasc(formatarDataNasc(v)); setErro(null); }}
                    placeholder={t('perfilEdit.dataNascPlaceholder')}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                  <ChevronDown size={16} color="#9CA3AF" />
                </View>
              </View>

              <Separador />

              {/* Sexo */}
              <View style={s.campo}>
                <Text style={s.campoLabel}>{t('perfilEdit.sexo')}</Text>
                <View style={s.generoRow}>
                  {GENEROS.map((g) => (
                    <TouchableOpacity
                      key={g.key}
                      style={[s.generoBtn, genero === g.key && s.generoBtnAtivo]}
                      onPress={() => setGenero(g.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.generoBtnTxt, genero === g.key && s.generoBtnTxtAtivo]}>
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* ── IDENTIFICAÇÃO ───────────────────────── */}
            <Text style={s.seccaoLabel}>{t('perfilEdit.seccaoIdentificacao')}</Text>
            <View style={s.card}>
              {/* Cartão de Cidadão */}
              <View style={s.campo}>
                <View style={s.campoLabelRow}>
                  <Text style={s.campoLabel}>{t('perfilEdit.cartaoCidadao')}</Text>
                  <Text style={s.soLeituraBadge}>{t('perfilEdit.soLeitura')}</Text>
                </View>
                <View style={s.inputWrapReadOnly}>
                  <CreditCard size={16} color="#9CA3AF" />
                  <Text style={s.inputReadOnly} numberOfLines={1}>
                    {utilizador?.cartao_cidadao ?? '—'}
                  </Text>
                  <Lock size={14} color="#D1D5DB" />
                </View>
              </View>

              <Separador />

              {/* Nº Utente */}
              <View style={s.campo}>
                <View style={s.campoLabelRow}>
                  <Text style={s.campoLabel}>{t('perfilEdit.numeroUtente')}</Text>
                  <Text style={s.soLeituraBadge}>{t('perfilEdit.soLeitura')}</Text>
                </View>
                <View style={s.inputWrapReadOnly}>
                  <FileText size={16} color="#9CA3AF" />
                  <Text style={s.inputReadOnly} numberOfLines={1}>
                    {utilizador?.numero_utente ?? '—'}
                  </Text>
                  <Lock size={14} color="#D1D5DB" />
                </View>
              </View>
            </View>

            {/* ── CONTACTO ────────────────────────────── */}
            <Text style={s.seccaoLabel}>{t('perfilEdit.seccaoContacto')}</Text>
            <View style={s.card}>
              {/* Telemóvel */}
              <View style={s.campo}>
                <Text style={s.campoLabel}>
                  {t('perfilEdit.telemovel')} <Text style={s.obrig}>*</Text>
                </Text>
                <View style={s.inputWrap}>
                  <Phone size={16} color="#9CA3AF" />
                  <TextInput
                    style={s.input}
                    value={contacto}
                    onChangeText={(v) => { setContacto(v); setErro(null); }}
                    placeholder={t('perfilEdit.telemovelPlaceholder')}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    maxLength={20}
                  />
                </View>
              </View>

              <Separador />

              {/* Morada */}
              <View style={s.campo}>
                <Text style={s.campoLabel}>
                  {t('perfilEdit.morada')} <Text style={s.obrig}>*</Text>
                </Text>
                <View style={s.inputWrap}>
                  <MapPin size={16} color="#9CA3AF" />
                  <TextInput
                    style={s.input}
                    value={morada}
                    onChangeText={(v) => { setMorada(v); setErro(null); }}
                    placeholder={t('perfilEdit.moradaPlaceholder')}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    maxLength={200}
                  />
                </View>
              </View>
            </View>

            {/* ── ACESSO ──────────────────────────────── */}
            <Text style={s.seccaoLabel}>{t('perfilEdit.seccaoAcesso')}</Text>
            <View style={s.card}>
              <View style={s.campo}>
                <View style={s.campoLabelRow}>
                  <Text style={s.campoLabel}>{t('perfilEdit.email')} <Text style={s.obrig}>*</Text></Text>
                  <Text style={s.soLeituraBadge}>{t('perfilEdit.soLeitura')}</Text>
                </View>
                <View style={s.inputWrapReadOnly}>
                  <Mail size={16} color="#9CA3AF" />
                  <Text style={s.inputReadOnly} numberOfLines={1}>
                    {email ?? '—'}
                  </Text>
                  <Lock size={14} color="#D1D5DB" />
                </View>
              </View>
            </View>

            {/* ── Erro ────────────────────────────────── */}
            {erro && (
              <View style={s.erroBox}>
                <Text style={s.erroTxt}>{erro}</Text>
              </View>
            )}

            {/* ── Guardar ─────────────────────────────── */}
            <TouchableOpacity
              style={[s.btnGuardar, aCarregar && s.btnDisabled]}
              onPress={guardar}
              disabled={aCarregar}
              activeOpacity={0.85}
            >
              {aCarregar ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.btnGuardarTxt}>{t('perfilEdit.guardarAlteracoes')}</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1A6FAF' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },

  // ── Header ───────────────────────────────────────────────────────────────────
  headerAzul: {
    backgroundColor: '#1A6FAF',
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  btnVoltar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitulo: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  avatarWrap: { alignItems: 'center', marginTop: 8 },
  avatarCirculo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#2C7CBD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },

  // ── Conteúdo ─────────────────────────────────────────────────────────────────
  conteudo: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: 24,
  },

  // ── Secções ───────────────────────────────────────────────────────────────────
  seccaoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },

  // ── Cards ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
    overflow: 'hidden',
  },
  sep: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },

  // ── Campo ─────────────────────────────────────────────────────────────────────
  campo: { padding: 14 },
  campoLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 },
  campoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  obrig: { color: '#EF4444' },
  soLeituraBadge: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  // ── Input editável ────────────────────────────────────────────────────────────
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A2E',
  },

  // ── Input só leitura ──────────────────────────────────────────────────────────
  inputWrapReadOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  inputReadOnly: { flex: 1, fontSize: 15, color: '#9CA3AF' },

  // ── Seletor de género ─────────────────────────────────────────────────────────
  generoRow: { flexDirection: 'row', gap: 8 },
  generoBtn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  generoBtnAtivo: { backgroundColor: '#1A6FAF', borderColor: '#1A6FAF' },
  generoBtnTxt: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  generoBtnTxtAtivo: { color: '#FFFFFF', fontWeight: '700' },

  // ── Erro ─────────────────────────────────────────────────────────────────────
  erroBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  erroTxt: { color: '#EF4444', fontSize: 13, textAlign: 'center' },

  // ── Botão guardar ─────────────────────────────────────────────────────────────
  btnGuardar: {
    backgroundColor: '#1A6FAF',
    borderRadius: 14,
    height: 54,
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
  btnGuardarTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
