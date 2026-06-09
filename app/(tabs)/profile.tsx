import { useEffect, useState, useCallback } from 'react';
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
import { ChevronRight, LogOut } from 'lucide-react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
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
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function generoLabel(genero: string | null): string {
  if (!genero) return '—';
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

// ─── Componentes de linha ─────────────────────────────────────────────────────

function LinhaInfo({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.linha}>
      <Text style={styles.linhaLabel}>{label}</Text>
      <Text style={styles.linhaValor} numberOfLines={1}>{valor}</Text>
    </View>
  );
}

function LinhaAcao({
  label,
  descricao,
  onPress,
}: {
  label: string;
  descricao?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.linha} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={styles.linhaLabel}>{label}</Text>
        {descricao && <Text style={styles.linhaDesc}>{descricao}</Text>}
      </View>
      <ChevronRight size={18} color="#6B7280" />
    </TouchableOpacity>
  );
}

function LinhaToggle({
  label,
  descricao,
  valor,
  onChange,
}: {
  label: string;
  descricao?: string;
  valor: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.linha}>
      <View style={{ flex: 1 }}>
        <Text style={styles.linhaLabel}>{label}</Text>
        {descricao && <Text style={styles.linhaDesc}>{descricao}</Text>}
      </View>
      <Switch
        value={valor}
        onValueChange={onChange}
        trackColor={{ false: '#E5E7EB', true: '#1A6FAF' }}
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

  const carregar = useCallback(async () => {
    if (!utilizador) return;
    try {
      const [e, m, c] = await Promise.all([
        getEmailDoPaciente(),
        getMedicoResponsavel(utilizador.id),
        getConsentimentoTreino(utilizador.id),
      ]);
      setEmail(e);
      setMedico(m);
      setConsentimento(c);
    } finally {
      setACarregar(false);
    }
  }, [utilizador]);

  useEffect(() => { carregar(); }, [carregar]);

  // Treino IA: activo se há consentimento sem data_revogacao
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
      ]
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho do perfil */}
        <View style={styles.perfilCabecalho}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>
              {utilizador ? iniciaisNome(utilizador.nome_completo) : 'MS'}
            </Text>
          </View>
          <Text style={styles.nome}>{utilizador?.nome_completo ?? '—'}</Text>
          <Text style={styles.emailTxt}>{email ?? '—'}</Text>
        </View>

        {/* OS MEUS DADOS */}
        <Text style={styles.seccaoTitulo}>OS MEUS DADOS</Text>
        <View style={styles.grupo}>
          <LinhaInfo label="Nome completo" valor={utilizador?.nome_completo ?? '—'} />
          <View style={styles.separador} />
          <LinhaInfo label="Data de nascimento" valor={dataFormatada(utilizador?.data_nascimento ?? null)} />
          <View style={styles.separador} />
          <LinhaInfo label="Género" valor={generoLabel(utilizador?.genero ?? null)} />
          <View style={styles.separador} />
          <LinhaInfo
            label="Médico responsável"
            valor={medico ? `Dr${medico.especialidade ? '' : ''} ${medico.nome_completo}` : '—'}
          />
        </View>

        {/* SEGURANÇA */}
        <Text style={styles.seccaoTitulo}>SEGURANÇA</Text>
        <View style={styles.grupo}>
          <LinhaAcao
            label="Alterar palavra-passe"
            onPress={() =>
              Alert.alert('Em breve', 'Esta funcionalidade estará disponível numa próxima versão.')
            }
          />
          <View style={styles.separador} />
          <LinhaToggle
            label="Autenticação de dois fatores"
            descricao="Código de verificação por email em cada acesso"
            valor={utilizador?.two_factor_ativo ?? false}
            onChange={toggle2FA}
          />
          <View style={styles.separador} />
          <LinhaAcao
            label="Sessões ativas"
            descricao="Gerir dispositivos com sessão iniciada"
            onPress={() =>
              Alert.alert('Em breve', 'A gestão de sessões estará disponível numa próxima versão.')
            }
          />
        </View>

        {/* PREFERÊNCIAS */}
        <Text style={styles.seccaoTitulo}>PREFERÊNCIAS</Text>
        <View style={styles.grupo}>
          <LinhaInfo label="Idioma" valor={idiomaLabel(utilizador?.idioma ?? 'pt')} />
          <View style={styles.separador} />
          <LinhaToggle
            label="Notificações push"
            valor={notifPush}
            onChange={setNotifPush}
          />
          <View style={styles.separador} />
          <LinhaInfo label="Registo de bem-estar" valor="Diário" />
        </View>

        {/* PRIVACIDADE E CONSENTIMENTOS */}
        <Text style={styles.seccaoTitulo}>PRIVACIDADE E CONSENTIMENTOS</Text>
        <View style={styles.grupo}>
          <LinhaToggle
            label="Treino de IA"
            descricao="Permitir que os seus dados clínicos anonimizados sejam utilizados para melhorar a precisão da IA."
            valor={treino_ia_ativo}
            onChange={toggleTreinoIa}
          />
        </View>

        {/* ACERCA */}
        <Text style={styles.seccaoTitulo}>ACERCA</Text>
        <View style={styles.grupo}>
          <LinhaInfo label="Versão da app" valor={versao} />
          <View style={styles.separador} />
          <LinhaAcao
            label="Política de privacidade"
            onPress={() =>
              Alert.alert('Em breve', 'A política de privacidade estará disponível em breve.')
            }
          />
          <View style={styles.separador} />
          <LinhaAcao
            label="Termos e condições"
            onPress={() =>
              Alert.alert('Em breve', 'Os termos e condições estarão disponíveis em breve.')
            }
          />
        </View>

        {/* Terminar sessão */}
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

  // Cabeçalho
  perfilCabecalho: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1A6FAF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarTxt: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  nome: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  emailTxt: { fontSize: 13, color: '#6B7280' },

  // Secções
  seccaoTitulo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginBottom: 6,
    marginTop: 4,
  },
  grupo: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  separador: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 20,
  },

  // Linhas
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 52,
    gap: 12,
  },
  linhaLabel: { fontSize: 14, color: '#1A1A2E', flex: 1 },
  linhaValor: { fontSize: 14, color: '#6B7280', maxWidth: '50%' },
  linhaDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Logout
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 16,
    minHeight: 52,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  btnLogoutTxt: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
