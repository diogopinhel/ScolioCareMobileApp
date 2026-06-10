import { ReactNode, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronRight,
  LogOut,
  Pencil,
  User,
  CalendarDays,
  Users,
  Lock,
  ShieldCheck,
  Smartphone,
  Languages,
  Bell,
  Activity,
  Brain,
  Info,
  FileText,
  ScrollText,
  Stethoscope,
} from 'lucide-react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../src/context/AuthContext';
import {
  getEmailDoPaciente,
  getMedicoResponsavel,
  getConsentimentoTreino,
  darConsentimentoTreino,
  revogarConsentimentoTreino,
  ConsentimentoTreino,
} from '../../src/data/repository/perfil';
import { MedicoResponsavel } from '../../src/data/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dataFormatada(iso: string | null): string {
  if (!iso) return 'Não definido';
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function generoLabel(genero: string | null): string {
  if (!genero) return 'Não definido';
  const map: Record<string, string> = {
    M: 'Masculino',
    F: 'Feminino',
    masculino: 'Masculino',
    feminino: 'Feminino',
    Masculino: 'Masculino',
    Feminino: 'Feminino',
  };
  return map[genero] ?? genero;
}

function idiomaLabel(idioma: string): string {
  const map: Record<string, string> = { pt: 'Português', en: 'English' };
  return map[idioma] ?? idioma;
}

function iniciaisNome(nome: string): string {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function CaixaIcone({ icone, fundo }: { icone: ReactNode; fundo: string }) {
  return (
    <View style={[styles.caixaIcone, { backgroundColor: fundo }]}>
      {icone}
    </View>
  );
}

function LinhaInfo({
  icone,
  fundoIcone = '#EFF6FF',
  label,
  valor,
}: {
  icone: ReactNode;
  fundoIcone?: string;
  label: string;
  valor: string;
}) {
  return (
    <View style={styles.linha}>
      <CaixaIcone icone={icone} fundo={fundoIcone} />
      <View style={{ flex: 1 }}>
        <Text style={styles.linhaMiniLabel}>{label}</Text>
        <Text style={styles.linhaValorInfo}>{valor}</Text>
      </View>
    </View>
  );
}

function LinhaAcao({
  icone,
  fundoIcone = '#EFF6FF',
  label,
  descricao,
  valor,
  onPress,
}: {
  icone: ReactNode;
  fundoIcone?: string;
  label: string;
  descricao?: string;
  valor?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.linha} onPress={onPress} activeOpacity={0.7}>
      <CaixaIcone icone={icone} fundo={fundoIcone} />
      <View style={{ flex: 1 }}>
        <Text style={styles.linhaLabel}>{label}</Text>
        {descricao && <Text style={styles.linhaDesc}>{descricao}</Text>}
      </View>
      {valor && <Text style={styles.linhaValorDir}>{valor}</Text>}
      <ChevronRight size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

function LinhaToggle({
  icone,
  fundoIcone = '#EFF6FF',
  label,
  descricao,
  valor,
  onChange,
  badge,
}: {
  icone: ReactNode;
  fundoIcone?: string;
  label: string;
  descricao?: string;
  valor: boolean;
  onChange: (v: boolean) => void;
  badge?: string;
}) {
  return (
    <View style={styles.linha}>
      <CaixaIcone icone={icone} fundo={fundoIcone} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.linhaLabel, { flex: 0 }]}>{label}</Text>
          {badge && (
            <View style={styles.badgeRecomendado}>
              <Text style={styles.badgeRecomendadoTxt}>{badge}</Text>
            </View>
          )}
        </View>
        {descricao && <Text style={styles.linhaDesc}>{descricao}</Text>}
      </View>
      <Switch
        value={valor}
        onValueChange={onChange}
        trackColor={{ false: '#E5E7EB', true: '#1D9E75' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

// ─── Ecrã principal ──────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { utilizador, logout, enviarOtp2FA, desativar2FA } = useAuth();

  const [email, setEmail] = useState<string | null>(null);
  const [medico, setMedico] = useState<MedicoResponsavel | null>(null);
  const [consentimento, setConsentimento] = useState<ConsentimentoTreino | null>(null);
  const [notifPush, setNotifPush] = useState(true);
  const [aCarregar, setACarregar] = useState(true);
  const [hasDismissed2FA, setHasDismissed2FA] = useState(false);

  const carregar = useCallback(async () => {
    if (!utilizador) return;
    try {
      const [e, m, c, dismissed] = await Promise.all([
        getEmailDoPaciente(),
        getMedicoResponsavel(utilizador.id),
        getConsentimentoTreino(utilizador.id),
        SecureStore.getItemAsync('hasDismissed2FASuggestion'),
      ]);
      setEmail(e);
      setMedico(m);
      setConsentimento(c);
      setHasDismissed2FA(dismissed === 'true');
    } finally {
      setACarregar(false);
    }
  }, [utilizador]);

  useEffect(() => { carregar(); }, [carregar]);

  const treino_ia_ativo =
    consentimento !== null && consentimento.data_revogacao === null;

  async function toggleTreinoIa(ativo: boolean) {
    if (!utilizador) return;
    try {
      if (ativo) {
        await darConsentimentoTreino(utilizador.id);
        await carregar();
      } else if (consentimento) {
        await revogarConsentimentoTreino(consentimento.id);
        setConsentimento({ ...consentimento, data_revogacao: new Date().toISOString() });
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível actualizar o consentimento. Tente novamente.');
    }
  }

  async function toggle2FA(ativo: boolean) {
    if (!email) return;
    if (ativo) {
      try {
        await enviarOtp2FA(email);
        router.push({
          pathname: '/(auth)/two-factor-verify' as never,
          params: { email, modo: 'ativar' },
        });
      } catch {
        Alert.alert('Erro', 'Não foi possível enviar o código de verificação. Tente novamente.');
      }
    } else {
      Alert.alert(
        'Desativar autenticação de dois fatores',
        'Tem a certeza que pretende desativar a verificação em dois passos?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desativar',
            style: 'destructive',
            onPress: async () => {
              try {
                await desativar2FA();
              } catch {
                Alert.alert('Erro', 'Não foi possível desativar a autenticação. Tente novamente.');
              }
            },
          },
        ],
      );
    }
  }

  async function terminarSessao() {
    Alert.alert(
      'Terminar sessão',
      'Tem a certeza que pretende terminar a sessão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Terminar sessão',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch {
              Alert.alert('Erro', 'Não foi possível terminar a sessão.');
            }
          },
        },
      ],
    );
  }

  if (aCarregar) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator size="large" color="#1A6FAF" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const versao = Constants.expoConfig?.version ?? '—';
  const nomeExibido = utilizador?.nome_completo ?? '—';
  const iniciaisMedico = medico ? iniciaisNome(medico.nome_completo) : '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cabeçalho ─────────────────────────────────── */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.editarBtnHeader}
            onPress={() =>
              Alert.alert('Em breve', 'Edição de perfil disponível numa próxima versão.')
            }
            activeOpacity={0.8}
          >
            <Pencil size={15} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.avatarCirculo}>
            <Text style={styles.avatarTxt}>
              {utilizador ? iniciaisNome(nomeExibido) : '??'}
            </Text>
          </View>
          <Text style={styles.headerNome}>{nomeExibido}</Text>
          <Text style={styles.headerEmail}>{email ?? '—'}</Text>
        </View>

        {/* ── OS MEUS DADOS ─────────────────────────────── */}
        <Text style={styles.seccaoTitulo}>OS MEUS DADOS</Text>
        <View style={styles.card}>
          <View style={styles.cardSubHeader}>
            <Text style={styles.cardSubHeaderTxt}>Informação pessoal</Text>
            <TouchableOpacity
              style={styles.btnEditar}
              onPress={() =>
                Alert.alert('Em breve', 'Edição de dados disponível numa próxima versão.')
              }
              activeOpacity={0.7}
            >
              <Text style={styles.btnEditarTxt}>+ Editar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.separador} />
          <LinhaInfo
            icone={<User size={18} color="#1A6FAF" />}
            label="Nome completo"
            valor={utilizador?.nome_completo ?? '—'}
          />
          <View style={styles.separador} />
          <LinhaInfo
            icone={<CalendarDays size={18} color="#1A6FAF" />}
            label="Data de nascimento"
            valor={dataFormatada(utilizador?.data_nascimento ?? null)}
          />
          <View style={styles.separador} />
          <LinhaInfo
            icone={<Users size={18} color="#1A6FAF" />}
            label="Género"
            valor={generoLabel(utilizador?.genero ?? null)}
          />
        </View>

        {/* ── DADOS CLÍNICOS ───────────────────────────── */}
        <Text style={styles.seccaoTitulo}>DADOS CLÍNICOS</Text>
        <View style={styles.card}>
          <View style={styles.cardSubHeader}>
            <View style={styles.cardSubHeaderEsquerda}>
              <Stethoscope size={18} color="#1A6FAF" />
              <Text style={styles.cardSubHeaderTxt}>Resumo clínico</Text>
            </View>
            <View style={styles.badgeSoLeitura}>
              <Text style={styles.badgeSoLeituraTxt}>Só leitura</Text>
            </View>
          </View>
          <View style={styles.separador} />
          <View style={styles.gridMetricas}>
            <View style={styles.gridColuna}>
              <Text style={styles.gridValor}>
                {utilizador?.peso != null ? String(utilizador.peso) : '—'}
              </Text>
              <Text style={styles.gridLabel}>Peso (kg)</Text>
            </View>
            <View style={styles.gridDivisor} />
            <View style={styles.gridColuna}>
              <Text style={styles.gridValor}>
                {utilizador?.altura != null ? String(utilizador.altura) : '—'}
              </Text>
              <Text style={styles.gridLabel}>Altura (cm)</Text>
            </View>
          </View>
          <View style={styles.separador} />
          <View style={styles.linha}>
            <View style={[
              styles.medicoAvatar,
              { backgroundColor: medico ? '#1A6FAF' : '#9CA3AF' },
            ]}>
              <Text style={styles.medicoAvatarTxt}>{iniciaisMedico}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.linhaMiniLabel}>Médico responsável</Text>
              <Text style={styles.linhaValorInfo}>
                {medico ? medico.nome_completo : 'Não atribuído'}
              </Text>
            </View>
            <Stethoscope size={18} color="#9CA3AF" />
          </View>
        </View>

        {/* ── SEGURANÇA ────────────────────────────────── */}
        <Text style={styles.seccaoTitulo}>SEGURANÇA</Text>
        <View style={styles.card}>
          <LinhaAcao
            icone={<Lock size={18} color="#1A6FAF" />}
            label="Alterar palavra-passe"
            onPress={() =>
              Alert.alert('Em breve', 'Esta funcionalidade estará disponível numa próxima versão.')
            }
          />
          <View style={styles.separador} />
          <LinhaToggle
            icone={<ShieldCheck size={18} color="#1D9E75" />}
            fundoIcone="#D1FAE5"
            label="Autenticação dois fatores"
            descricao="Código por email em cada acesso"
            valor={utilizador?.two_factor_ativo ?? false}
            onChange={toggle2FA}
            badge={hasDismissed2FA && !utilizador?.two_factor_ativo ? 'Recomendado' : undefined}
          />
          <View style={styles.separador} />
          <LinhaAcao
            icone={<Smartphone size={18} color="#1A6FAF" />}
            label="Sessões ativas"
            descricao="Gerir dispositivos com sessão iniciada"
            onPress={() =>
              Alert.alert('Em breve', 'A gestão de sessões estará disponível numa próxima versão.')
            }
          />
        </View>

        {/* ── PREFERÊNCIAS ─────────────────────────────── */}
        <Text style={styles.seccaoTitulo}>PREFERÊNCIAS</Text>
        <View style={styles.card}>
          <LinhaAcao
            icone={<Languages size={18} color="#1A6FAF" />}
            label="Idioma"
            valor={idiomaLabel(utilizador?.idioma ?? 'pt')}
            onPress={() =>
              Alert.alert('Em breve', 'Definições de idioma disponíveis numa próxima versão.')
            }
          />
          <View style={styles.separador} />
          <LinhaToggle
            icone={<Bell size={18} color="#F59E0B" />}
            fundoIcone="#FEF3C7"
            label="Notificações push"
            valor={notifPush}
            onChange={setNotifPush}
          />
          <View style={styles.separador} />
          <LinhaAcao
            icone={<Activity size={18} color="#1D9E75" />}
            fundoIcone="#D1FAE5"
            label="Registo de bem-estar"
            valor="Diário"
            onPress={() =>
              Alert.alert(
                'Em breve',
                'Configuração do registo de bem-estar disponível numa próxima versão.',
              )
            }
          />
        </View>

        {/* ── PRIVACIDADE E CONSENTIMENTOS ─────────────── */}
        <Text style={styles.seccaoTitulo}>PRIVACIDADE E CONSENTIMENTOS</Text>
        <View style={styles.card}>
          <LinhaToggle
            icone={<Brain size={18} color="#1A6FAF" />}
            label="Treino de IA"
            descricao="Dados clínicos anonimizados para melhorar a IA"
            valor={treino_ia_ativo}
            onChange={toggleTreinoIa}
          />
        </View>

        {/* ── ACERCA ───────────────────────────────────── */}
        <Text style={styles.seccaoTitulo}>ACERCA</Text>
        <View style={styles.card}>
          <View style={styles.linha}>
            <CaixaIcone icone={<Info size={18} color="#1A6FAF" />} fundo="#EFF6FF" />
            <Text style={[styles.linhaLabel, { flex: 1 }]}>Versão da app</Text>
            <Text style={styles.linhaValorDir}>{versao}</Text>
          </View>
          <View style={styles.separador} />
          <LinhaAcao
            icone={<FileText size={18} color="#1A6FAF" />}
            label="Política de privacidade"
            onPress={() =>
              Alert.alert('Em breve', 'A política de privacidade estará disponível em breve.')
            }
          />
          <View style={styles.separador} />
          <LinhaAcao
            icone={<ScrollText size={18} color="#1A6FAF" />}
            label="Termos e condições"
            onPress={() =>
              Alert.alert('Em breve', 'Os termos e condições estarão disponíveis em breve.')
            }
          />
        </View>

        {/* ── Terminar sessão ──────────────────────────── */}
        <TouchableOpacity style={styles.btnLogout} onPress={terminarSessao} activeOpacity={0.8}>
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.btnLogoutTxt}>Terminar sessão</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingBottom: 40 },

  // ── Header card ──────────────────────────────────────────────────────────────
  headerCard: {
    backgroundColor: '#1A6FAF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 28,
    paddingTop: 20,
    paddingBottom: 28,
    alignItems: 'center',
  },
  editarBtnHeader: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCirculo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#2980B9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  avatarTxt: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },
  headerNome: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  headerEmail: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  // ── Secções ───────────────────────────────────────────────────────────────────
  seccaoTitulo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
  },

  // ── Cards ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cardSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardSubHeaderEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardSubHeaderTxt: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },

  // ── Botão Editar ─────────────────────────────────────────────────────────────
  btnEditar: {
    borderWidth: 1,
    borderColor: '#1A6FAF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  btnEditarTxt: { fontSize: 13, color: '#1A6FAF', fontWeight: '600' },

  // ── Badge "Só leitura" ────────────────────────────────────────────────────────
  badgeSoLeitura: {
    backgroundColor: '#1A1A2E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeSoLeituraTxt: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },

  // ── Separador ────────────────────────────────────────────────────────────────
  separador: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },

  // ── Linhas ────────────────────────────────────────────────────────────────────
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    minHeight: 56,
  },
  linhaLabel: { fontSize: 14, color: '#1A1A2E', fontWeight: '500' },
  linhaMiniLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  linhaValorInfo: { fontSize: 14, color: '#1A1A2E' },
  linhaValorDir: { fontSize: 14, color: '#6B7280' },
  linhaDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // ── Caixa de ícone ────────────────────────────────────────────────────────────
  caixaIcone: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Grid métricas (peso / altura) ────────────────────────────────────────────
  gridMetricas: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  gridColuna: { flex: 1, alignItems: 'center' },
  gridDivisor: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  gridValor: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  gridLabel: { fontSize: 12, color: '#6B7280' },

  // ── Avatar médico ─────────────────────────────────────────────────────────────
  medicoAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicoAvatarTxt: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // ── Badge "Recomendado" ───────────────────────────────────────────────────────
  badgeRecomendado: {
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeRecomendadoTxt: { fontSize: 9, color: '#1A6FAF', fontWeight: '600' },

  // ── Botão Logout ─────────────────────────────────────────────────────────────
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 16,
    minHeight: 52,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  btnLogoutTxt: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
