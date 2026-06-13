import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Bell, FileText, Calendar, Activity, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import {
  getNotificacoesDoPaciente,
  marcarComoLida,
  resolverTextoNotificacao,
  Notificacao,
} from '../../src/data/repository/notificacoes';
import { i18n, useTranslation } from '../../src/i18n';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tempoAtras(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return i18n.t('notificacoes.haDias', { count: d, contagem: d });
  if (h > 0) return i18n.t('notificacoes.haHoras', { count: h, contagem: h });
  if (min > 0) return i18n.t('notificacoes.haMinutos', { count: min, contagem: min });
  return i18n.t('notificacoes.agoraMesmo');
}

type IconeInfo = { icone: React.ReactNode; cor: string; bgCor: string };

function iconeParaTipo(tipo: string): IconeInfo {
  const t = tipo.toUpperCase();
  if (t === 'EXAME' || t === 'RELATORIO') {
    return {
      icone: <FileText size={18} color="#1A6FAF" />,
      cor: '#1A6FAF',
      bgCor: '#EFF6FF',
    };
  }
  if (t === 'CONSULTA' || t === 'LEMBRETE') {
    return {
      icone: <Calendar size={18} color="#D97706" />,
      cor: '#D97706',
      bgCor: '#FEF3C7',
    };
  }
  if (t === 'WELLNESS' || t === 'BEM_ESTAR') {
    return {
      icone: <Activity size={18} color="#1D9E75" />,
      cor: '#1D9E75',
      bgCor: '#DCFCE7',
    };
  }
  return {
    icone: <Bell size={18} color="#6B7280" />,
    cor: '#6B7280',
    bgCor: '#F3F4F6',
  };
}

// ─── Card de notificação ─────────────────────────────────────────────────────

interface CardProps {
  notificacao: Notificacao;
  onPress: () => void;
}

function NotificacaoCard({ notificacao, onPress }: CardProps) {
  const { icone, bgCor } = iconeParaTipo(notificacao.tipo);
  const lida = notificacao.data_leitura !== null;

  return (
    <TouchableOpacity
      style={[styles.card, !lida && styles.cardNaoLido]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Indicador de não lida */}
      {!lida && <View style={styles.ponto} />}

      {/* Ícone */}
      <View style={[styles.iconWrap, { backgroundColor: bgCor }]}>
        {icone}
      </View>

      {/* Texto */}
      <View style={styles.textos}>
        <Text style={[styles.cardTitulo, !lida && styles.cardTituloNaoLido]} numberOfLines={2}>
          {resolverTextoNotificacao(notificacao).titulo}
        </Text>
        <Text style={styles.mensagem} numberOfLines={2}>
          {resolverTextoNotificacao(notificacao).mensagem}
        </Text>
        <Text style={styles.tempo}>{tempoAtras(notificacao.data_envio)}</Text>
      </View>

      <ChevronRight size={16} color="#6B7280" />
    </TouchableOpacity>
  );
}

// ─── Ecrã principal ──────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { utilizador } = useAuth();
  const { t } = useTranslation();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [notifDetalhe, setNotifDetalhe] = useState<Notificacao | null>(null);

  const carregar = useCallback(async () => {
    if (!utilizador) return;
    try {
      const dados = await getNotificacoesDoPaciente(utilizador.id);
      setNotificacoes(dados);
    } finally {
      setACarregar(false);
    }
  }, [utilizador]);

  useEffect(() => { carregar(); }, [carregar]);

  async function aoTocarNotificacao(notificacao: Notificacao) {
    // Marca como lida se ainda não estava
    if (!notificacao.data_leitura) {
      await marcarComoLida(notificacao.id);
      setNotificacoes((prev) =>
        prev.map((n) =>
          n.id === notificacao.id
            ? { ...n, data_leitura: new Date().toISOString() }
            : n
        )
      );
    }

    // Navega para a entidade referenciada, ou mostra detalhe se não houver destino
    if (notificacao.referencia_entidade === 'estudos' && notificacao.referencia_id) {
      router.push(`/(tabs)/exams/${notificacao.referencia_id}` as never);
    } else {
      setNotifDetalhe(notificacao);
    }
  }

  async function marcarTodasComoLidas() {
    const naoLidas = notificacoes.filter((n) => !n.data_leitura);
    await Promise.all(naoLidas.map((n) => marcarComoLida(n.id)));
    setNotificacoes((prev) =>
      prev.map((n) => ({ ...n, data_leitura: n.data_leitura ?? new Date().toISOString() }))
    );
  }

  const naoLidas = notificacoes.filter((n) => !n.data_leitura).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.btnVoltar}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <View style={styles.headerCentro}>
          <Text style={styles.titulo}>{t('notificacoes.titulo')}</Text>
          {naoLidas > 0 && (
            <Text style={styles.subtitulo}>
              {naoLidas === 1 ? t('notificacoes.naoLidaSingular', { contagem: naoLidas }) : t('notificacoes.naoLidaPlural', { contagem: naoLidas })}
            </Text>
          )}
        </View>
        {naoLidas > 0 ? (
          <TouchableOpacity onPress={marcarTodasComoLidas} activeOpacity={0.7} style={styles.btnMarcar}>
            <Text style={styles.marcarTodas}>{t('notificacoes.marcarTodas')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.btnMarcar} />
        )}
      </View>

      {aCarregar ? (
        <ActivityIndicator size="large" color="#1A6FAF" style={{ marginTop: 48 }} />
      ) : notificacoes.length === 0 ? (
        <View style={styles.vazio}>
          <Bell size={48} color="#6B7280" />
          <Text style={styles.vazioTitulo}>{t('notificacoes.vazioTitulo')}</Text>
          <Text style={styles.vazioDesc}>
            {t('notificacoes.vazioDesc')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notificacoes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificacaoCard
              notificacao={item}
              onPress={() => aoTocarNotificacao(item)}
            />
          )}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separador} />}
        />
      )}
      {/* Modal de detalhe para notificações sem destino de navegação */}
      {notifDetalhe && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setNotifDetalhe(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setNotifDetalhe(null)}
          >
            <View style={styles.modalCaixa}>
              <View style={[styles.modalIconWrap, { backgroundColor: iconeParaTipo(notifDetalhe.tipo).bgCor }]}>
                {iconeParaTipo(notifDetalhe.tipo).icone}
              </View>
              <Text style={styles.modalTitulo}>{resolverTextoNotificacao(notifDetalhe).titulo}</Text>
              <Text style={styles.modalMensagem}>{resolverTextoNotificacao(notifDetalhe).mensagem}</Text>
              <Text style={styles.modalTempo}>{tempoAtras(notifDetalhe.data_envio)}</Text>
              <TouchableOpacity
                style={styles.modalBtnFechar}
                onPress={() => setNotifDetalhe(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnFecharTxt}>{t('notificacoes.fechar')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  btnVoltar: {
    width: 40,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCentro: { flex: 1 },
  btnMarcar: { width: 80, alignItems: 'flex-end' },
  titulo: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  subtitulo: { fontSize: 12, color: '#1A6FAF', marginTop: 1, fontWeight: '500' },
  marcarTodas: { fontSize: 12, color: '#1A6FAF', fontWeight: '500' },

  lista: { paddingHorizontal: 16, paddingBottom: 24 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    position: 'relative',
  },
  cardNaoLido: {
    backgroundColor: '#FAFCFF',
    borderLeftWidth: 3,
    borderLeftColor: '#1A6FAF',
  },
  ponto: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1A6FAF',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textos: { flex: 1 },
  cardTitulo: { fontSize: 14, fontWeight: '500', color: '#1A1A2E', lineHeight: 20 },
  cardTituloNaoLido: { fontWeight: '700' },
  mensagem: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 18 },
  tempo: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  separador: { height: 8 },

  vazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  vazioTitulo: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  vazioDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },

  // ── Modal de detalhe ──────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCaixa: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    gap: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalMensagem: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 21,
  },
  modalTempo: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  modalBtnFechar: {
    marginTop: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnFecharTxt: { fontSize: 14, fontWeight: '700', color: '#1A6FAF' },
});
