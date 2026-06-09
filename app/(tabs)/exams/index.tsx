import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FileText, TrendingDown, TrendingUp, Clock } from 'lucide-react-native';
import { useAuth } from '../../../src/context/AuthContext';
import { getEstudosDoPaciente, getUrlImagemEstudo } from '../../../src/data/repository/estudos';
import { EstudoComResultado, EstadoEstudo } from '../../../src/data/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

type Filtro = 'todos' | 'analisados' | 'pendentes';

function dataFormatada(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type EstadoInfo = { label: string; cor: string; bgCor: string };

function estadoInfo(estado: EstadoEstudo): EstadoInfo {
  switch (estado) {
    case 'DIAGNOSED':
    case 'SENT':
      return { label: 'ANALISADO', cor: '#1D9E75', bgCor: '#DCFCE7' };
    case 'PENDING_VALIDATION':
    case 'VALIDATED':
      return { label: 'PENDENTE', cor: '#D97706', bgCor: '#FEF3C7' };
    case 'UPLOADED':
    case 'PROCESSING':
      return { label: 'EM ANÁLISE', cor: '#1A6FAF', bgCor: '#EFF6FF' };
    case 'ARCHIVED':
      return { label: 'ARQUIVADO', cor: '#6B7280', bgCor: '#F3F4F6' };
  }
}

function filtrar(estudos: EstudoComResultado[], filtro: Filtro): EstudoComResultado[] {
  switch (filtro) {
    case 'analisados':
      return estudos.filter((e) => e.estado === 'DIAGNOSED' || e.estado === 'SENT');
    case 'pendentes':
      return estudos.filter(
        (e) =>
          e.estado === 'UPLOADED' ||
          e.estado === 'PROCESSING' ||
          e.estado === 'PENDING_VALIDATION' ||
          e.estado === 'VALIDATED'
      );
    default:
      return estudos;
  }
}

// ─── Card de exame ───────────────────────────────────────────────────────────

interface CardProps {
  estudo: EstudoComResultado;
  deltaAngulo: number | null;
  urlImagem: string | null;
  onPress: () => void;
}

function ExameCard({ estudo, deltaAngulo, urlImagem, onPress }: CardProps) {
  const info = estadoInfo(estudo.estado);
  const angulo = estudo.resultado?.angulo_cobb;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Thumbnail */}
      <View style={styles.thumbnail}>
        {urlImagem ? (
          <Image source={{ uri: urlImagem }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Text style={styles.thumbnailTxt}>XRAY</Text>
        )}
      </View>

      {/* Conteúdo */}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardData}>{dataFormatada(estudo.data_estudo)}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: info.bgCor }]}>
            <Text style={[styles.estadoTxt, { color: info.cor }]}>{info.label}</Text>
          </View>
        </View>

        <Text style={styles.cobbLabel}>Ângulo de Cobb</Text>
        <View style={styles.cardBottomRow}>
          <Text style={styles.cobbValor}>
            {angulo != null ? `${angulo.toFixed(1)}°` : '—'}
          </Text>
          {deltaAngulo != null && angulo != null && (
            <View style={[
              styles.deltaBadge,
              { backgroundColor: deltaAngulo <= 0 ? '#DCFCE7' : '#FEE2E2' },
            ]}>
              {deltaAngulo < 0
                ? <TrendingDown size={12} color="#1D9E75" />
                : <TrendingUp size={12} color="#EF4444" />
              }
              <Text style={[
                styles.deltaTxt,
                { color: deltaAngulo <= 0 ? '#1D9E75' : '#EF4444' },
              ]}>
                {Math.abs(deltaAngulo).toFixed(1)}°
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Ecrã principal ──────────────────────────────────────────────────────────

export default function ExamsScreen() {
  const { utilizador } = useAuth();
  const [estudos, setEstudos] = useState<EstudoComResultado[]>([]);
  const [urlsImagens, setUrlsImagens] = useState<Record<string, string>>({});
  const [aCarregar, setACarregar] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const contaPendente = !!utilizador && !utilizador.conta_ativada;

  const carregar = useCallback(async () => {
    if (!utilizador || contaPendente) return;
    try {
      const dados = await getEstudosDoPaciente(utilizador.id);
      setEstudos(dados);
      const urls: Record<string, string> = {};
      await Promise.all(
        dados
          .filter((e) => e.imagemPath)
          .map(async (e) => {
            const url = await getUrlImagemEstudo(e.imagemPath!);
            if (url) urls[e.id] = url;
          })
      );
      setUrlsImagens(urls);
    } finally {
      setACarregar(false);
    }
  }, [utilizador, contaPendente]);

  useEffect(() => { carregar(); }, [carregar]);

  if (contaPendente) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Os meus exames</Text>
          <Text style={styles.subtitulo}>Histórico e evolução</Text>
        </View>
        <View style={styles.pendente}>
          <View style={styles.pendenteIconWrap}>
            <Clock size={36} color="#1A6FAF" />
          </View>
          <Text style={styles.pendenteTitulo}>Conta pendente de verificação</Text>
          <Text style={styles.pendenteDesc}>
            A sua conta ainda não foi ativada. Os seus exames ficarão disponíveis assim que
            um médico responsável for atribuído pelo técnico clínico.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const visiveis = filtrar(estudos, filtro);

  const filtros: { key: Filtro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'analisados', label: 'Analisados' },
    { key: 'pendentes', label: 'Pendentes' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.titulo}>Os meus exames</Text>
          <Text style={styles.subtitulo}>Histórico e evolução</Text>
        </View>
      </View>

      {/* Tabs de filtro */}
      <View style={styles.tabsWrap}>
        {filtros.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.tab, filtro === f.key && styles.tabActivo]}
            onPress={() => setFiltro(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabTxt, filtro === f.key && styles.tabTxtActivo]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      {aCarregar ? (
        <ActivityIndicator size="large" color="#1A6FAF" style={{ marginTop: 48 }} />
      ) : visiveis.length === 0 ? (
        <View style={styles.vazio}>
          <FileText size={48} color="#6B7280" />
          <Text style={styles.vazioTitulo}>Sem exames</Text>
          <Text style={styles.vazioDesc}>
            {filtro === 'todos'
              ? 'Ainda não tem exames registados.'
              : `Não tem exames na categoria "${filtros.find((f) => f.key === filtro)?.label}".`}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
        >
          {visiveis.map((estudo, idx) => {
            // delta: diferença face ao exame seguinte na lista original (ordenada desc)
            const idxOriginal = estudos.indexOf(estudo);
            const anterior = estudos[idxOriginal + 1];
            const delta =
              estudo.resultado?.angulo_cobb != null &&
              anterior?.resultado?.angulo_cobb != null
                ? estudo.resultado.angulo_cobb - anterior.resultado.angulo_cobb
                : null;

            return (
              <ExameCard
                key={estudo.id}
                estudo={estudo}
                deltaAngulo={delta}
                urlImagem={urlsImagens[estudo.id] ?? null}
                onPress={() => router.push(`/(tabs)/exams/${estudo.id}` as never)}
              />
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titulo: { fontSize: 24, fontWeight: '800', color: '#1A1A2E' },
  subtitulo: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  tabsWrap: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActivo: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabTxt: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabTxtActivo: { color: '#1A6FAF', fontWeight: '700' },

  lista: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  thumbnail: {
    width: 88,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailTxt: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardBody: { flex: 1, padding: 14 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardData: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  estadoBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  estadoTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  cobbLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cobbValor: { fontSize: 26, fontWeight: '800', color: '#1A1A2E' },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deltaTxt: { fontSize: 12, fontWeight: '700' },

  vazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  vazioTitulo: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  vazioDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center' },

  pendente: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  pendenteIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendenteTitulo: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  pendenteDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});
