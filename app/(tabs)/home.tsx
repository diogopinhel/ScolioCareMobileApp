import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, FileText, TrendingDown, TrendingUp, Minus, Activity } from 'lucide-react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useAuth } from '../../src/context/AuthContext';
import { getEstudosDoPaciente } from '../../src/data/repository/estudos';
import { getNotificacoesDoPaciente, Notificacao } from '../../src/data/repository/notificacoes';
import { EstudoComResultado } from '../../src/data/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function primeiroNome(nomeCompleto: string): string {
  return nomeCompleto.split(' ')[0] ?? nomeCompleto;
}

function dataHoje(): string {
  const agora = new Date();
  return agora.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function dataExame(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function mesAbreviado(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '');
}

function tempoAtras(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `há ${d} dia${d > 1 ? 's' : ''}`;
  if (h > 0) return `há ${h} hora${h > 1 ? 's' : ''}`;
  return `há ${min} minuto${min !== 1 ? 's' : ''}`;
}

function bandaSeveridade(angulo: number): string {
  if (angulo < 10) return 'Normal (< 10°)';
  if (angulo <= 25) return `Grau leve (10°–25°)`;
  if (angulo <= 40) return `Grau moderado (25°–40°)`;
  return `Grau grave (> 40°)`;
}

function estadoLabel(estado: string): string {
  const map: Record<string, string> = {
    UPLOADED: 'Submetido',
    PROCESSING: 'A processar',
    PENDING_VALIDATION: 'Validação pendente',
    VALIDATED: 'Validado',
    DIAGNOSED: 'Analisado',
    SENT: 'Enviado',
    ARCHIVED: 'Arquivado',
  };
  return map[estado] ?? estado;
}

function estadoCor(estado: string): string {
  const map: Record<string, string> = {
    UPLOADED: '#6B7280',
    PROCESSING: '#F59E0B',
    PENDING_VALIDATION: '#F59E0B',
    VALIDATED: '#1A6FAF',
    DIAGNOSED: '#1D9E75',
    SENT: '#1D9E75',
    ARCHIVED: '#6B7280',
  };
  return map[estado] ?? '#6B7280';
}

// ─── Mini gráfico SVG ────────────────────────────────────────────────────────

interface GraficoProps {
  estudos: EstudoComResultado[];
}

function MiniGrafico({ estudos }: GraficoProps) {
  const dados = estudos
    .filter((e) => e.resultado?.angulo_cobb != null)
    .slice(0, 5)
    .reverse();

  if (dados.length < 2) {
    return (
      <View style={styles.graficoVazio}>
        <Text style={styles.graficoVazioTxt}>Dados insuficientes para o gráfico</Text>
      </View>
    );
  }

  const W = 280;
  const H = 100;
  const PAD_L = 36;
  const PAD_R = 12;
  const PAD_T = 10;
  const PAD_B = 24;

  const valores = dados.map((e) => e.resultado!.angulo_cobb);
  const min = Math.floor(Math.min(...valores) - 2);
  const max = Math.ceil(Math.max(...valores) + 2);
  const rangeY = max - min || 1;
  const rangeX = dados.length - 1;

  function xPx(i: number) {
    return PAD_L + (i / rangeX) * (W - PAD_L - PAD_R);
  }
  function yPx(v: number) {
    return PAD_T + ((max - v) / rangeY) * (H - PAD_T - PAD_B);
  }

  const pontos = dados.map((e, i) => `${xPx(i)},${yPx(e.resultado!.angulo_cobb)}`).join(' ');

  const yTicks = [min, Math.round((min + max) / 2), max];

  return (
    <Svg width={W} height={H}>
      {/* Grid lines */}
      {yTicks.map((v) => (
        <Line
          key={v}
          x1={PAD_L}
          y1={yPx(v)}
          x2={W - PAD_R}
          y2={yPx(v)}
          stroke="#E5E7EB"
          strokeWidth={1}
        />
      ))}
      {/* Y labels */}
      {yTicks.map((v) => (
        <SvgText
          key={`yl-${v}`}
          x={PAD_L - 4}
          y={yPx(v) + 4}
          fontSize={9}
          fill="#6B7280"
          textAnchor="end"
        >
          {v}
        </SvgText>
      ))}
      {/* Line */}
      <Polyline points={pontos} fill="none" stroke="#1A6FAF" strokeWidth={2} strokeLinejoin="round" />
      {/* Points */}
      {dados.map((e, i) => (
        <Circle
          key={e.id}
          cx={xPx(i)}
          cy={yPx(e.resultado!.angulo_cobb)}
          r={4}
          fill="#1A6FAF"
        />
      ))}
      {/* X labels */}
      {dados.map((e, i) => (
        <SvgText
          key={`xl-${e.id}`}
          x={xPx(i)}
          y={H - 4}
          fontSize={9}
          fill="#6B7280"
          textAnchor="middle"
        >
          {mesAbreviado(e.data_estudo)}
        </SvgText>
      ))}
    </Svg>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function HomeScreen() {
  const { utilizador } = useAuth();
  const [estudos, setEstudos] = useState<EstudoComResultado[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [aCarregar, setACarregar] = useState(true);

  const carregar = useCallback(async () => {
    if (!utilizador) return;
    try {
      const [e, n] = await Promise.all([
        getEstudosDoPaciente(utilizador.id),
        getNotificacoesDoPaciente(utilizador.id),
      ]);
      setEstudos(e);
      setNotificacoes(n);
    } finally {
      setACarregar(false);
    }
  }, [utilizador]);

  useEffect(() => { carregar(); }, [carregar]);

  const ultimoExame = estudos[0] ?? null;
  const exameAnterior = estudos[1] ?? null;
  const notifNaoLidas = notificacoes.filter((n) => !n.data_leitura);

  function deltaCobb(): string | null {
    if (!ultimoExame?.resultado || !exameAnterior?.resultado) return null;
    const diff = ultimoExame.resultado.angulo_cobb - exameAnterior.resultado.angulo_cobb;
    const sinal = diff < 0 ? '↘' : diff > 0 ? '↗' : '→';
    return `${sinal} ${Math.abs(diff).toFixed(1)}° vs. exame anterior`;
  }

  function deltaCor(): string {
    if (!ultimoExame?.resultado || !exameAnterior?.resultado) return '#6B7280';
    const diff = ultimoExame.resultado.angulo_cobb - exameAnterior.resultado.angulo_cobb;
    return diff < 0 ? '#1D9E75' : diff > 0 ? '#EF4444' : '#6B7280';
  }

  const delta = deltaCobb();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header com gradiente */}
      <LinearGradient
        colors={['#1A6FAF', '#1565A0']}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>
              {utilizador
                ? utilizador.nome_completo
                    .split(' ')
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase()
                : 'MS'}
            </Text>
          </View>

          {/* Saudação */}
          <View style={styles.saudacaoWrap}>
            <Text style={styles.saudacao}>
              Olá, {utilizador ? primeiroNome(utilizador.nome_completo) : ''}
            </Text>
            <Text style={styles.dataHoje}>{dataHoje()}</Text>
          </View>

          {/* Sino */}
          <TouchableOpacity style={styles.sinoWrap} onPress={() => {}}>
            <Bell size={22} color="#FFFFFF" />
            {notifNaoLidas.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>
                  {notifNaoLidas.length > 9 ? '9+' : notifNaoLidas.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {aCarregar ? (
          <ActivityIndicator size="large" color="#1A6FAF" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ── Último exame ─────────────────────────────────────── */}
            <Text style={styles.seccaoTitulo}>O seu último exame</Text>

            {ultimoExame ? (
              <View style={[styles.card, styles.cardExame]}>
                <Text style={styles.exameLabel}>Data do exame</Text>
                <Text style={styles.exameData}>{dataExame(ultimoExame.data_estudo)}</Text>

                <Text style={[styles.exameLabel, { marginTop: 12 }]}>Ângulo de Cobb</Text>
                <View style={styles.cobbRow}>
                  <Text style={styles.cobbValor}>
                    {ultimoExame.resultado?.angulo_cobb.toFixed(1) ?? '—'}°
                  </Text>
                  {delta && (
                    <Text style={[styles.cobbDelta, { color: deltaCor() }]}>{delta}</Text>
                  )}
                </View>
                {ultimoExame.resultado && (
                  <Text style={styles.bandaSeveridade}>
                    {bandaSeveridade(ultimoExame.resultado.angulo_cobb)}
                  </Text>
                )}

                <View style={styles.estadoRow}>
                  <View style={[styles.estadoBadge, { borderColor: estadoCor(ultimoExame.estado) }]}>
                    <Text style={[styles.estadoTxt, { color: estadoCor(ultimoExame.estado) }]}>
                      {estadoLabel(ultimoExame.estado)}
                    </Text>
                  </View>
                  {ultimoExame.ficheiro_pdf && (
                    <Text style={styles.pdfLabel}>Relatório disponível</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.verExameBtn}
                  onPress={() => router.push(`/(tabs)/exams/${ultimoExame.id}` as never)}
                >
                  <Text style={styles.verExameTxt}>Ver exame</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.card, styles.vazioCard]}>
                <FileText size={36} color="#6B7280" />
                <Text style={styles.vazioTitulo}>Sem exames disponíveis</Text>
                <Text style={styles.vazioDesc}>Os seus exames aparecerão aqui assim que forem submetidos.</Text>
              </View>
            )}

            {/* ── Evolução recente ──────────────────────────────────── */}
            <View style={styles.seccaoRow}>
              <Text style={styles.seccaoTitulo}>Evolução recente</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/exams' as never)}>
                <Text style={styles.linkTxt}>Ver histórico completo</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.graficoSub}>Ângulo de Cobb – Últimos 5 exames</Text>
              {estudos.length >= 2 ? (
                <MiniGrafico estudos={estudos} />
              ) : (
                <View style={styles.graficoVazio}>
                  <Text style={styles.graficoVazioTxt}>
                    São necessários pelo menos 2 exames para mostrar a evolução.
                  </Text>
                </View>
              )}
            </View>

            {/* ── Notificações ─────────────────────────────────────── */}
            <View style={styles.seccaoRow}>
              <Text style={styles.seccaoTitulo}>Notificações</Text>
              {notificacoes.length > 0 && (
                <TouchableOpacity onPress={() => {}}>
                  <Text style={styles.linkTxt}>
                    Ver todas ({notificacoes.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {notificacoes.length === 0 ? (
              <View style={[styles.card, styles.vazioCard]}>
                <Bell size={28} color="#6B7280" />
                <Text style={styles.vazioTitulo}>Sem notificações</Text>
              </View>
            ) : (
              notificacoes.slice(0, 2).map((n) => (
                <TouchableOpacity key={n.id} style={styles.notifCard}>
                  <View style={styles.notifIconWrap}>
                    <Activity size={16} color="#1A6FAF" />
                  </View>
                  <View style={styles.notifTextos}>
                    <Text style={styles.notifTitulo} numberOfLines={1}>{n.titulo}</Text>
                    <Text style={styles.notifTempo}>{tempoAtras(n.data_envio)}</Text>
                  </View>
                  <Text style={styles.notifChevron}>›</Text>
                </TouchableOpacity>
              ))
            )}

            {/* ── Bem-estar ─────────────────────────────────────────── */}
            <Text style={[styles.seccaoTitulo, { marginTop: 8 }]}>O meu bem-estar</Text>

            <View style={styles.wellnessCard}>
              <View style={styles.wellnessIconWrap}>
                <Activity size={24} color="#FFFFFF" />
              </View>
              <View style={styles.wellnessTextos}>
                <Text style={styles.wellnessTitulo}>Como se sente hoje?</Text>
                <Text style={styles.wellnessDesc}>
                  Registe o seu nível de dor, mobilidade e bem-estar geral
                </Text>
              </View>
              <TouchableOpacity style={styles.wellnessBtn} onPress={() => {}}>
                <Text style={styles.wellnessBtnTxt}>Registar bem-estar</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  saudacaoWrap: { flex: 1 },
  saudacao: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  dataHoje: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  sinoWrap: { position: 'relative', padding: 4, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTxt: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  // Secções
  seccaoTitulo: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 10, marginTop: 4 },
  seccaoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  linkTxt: { fontSize: 13, color: '#1A6FAF', fontWeight: '500' },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardExame: { backgroundColor: '#EFF6FF' },

  // Exame
  exameLabel: { fontSize: 12, color: '#6B7280' },
  exameData: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginTop: 2 },
  cobbRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 4 },
  cobbValor: { fontSize: 40, fontWeight: '800', color: '#1A1A2E' },
  cobbDelta: { fontSize: 13, fontWeight: '600' },
  bandaSeveridade: { fontSize: 12, color: '#6B7280', marginTop: 2, marginBottom: 10 },
  estadoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  estadoBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  estadoTxt: { fontSize: 12, fontWeight: '600' },
  pdfLabel: { fontSize: 12, color: '#6B7280' },
  verExameBtn: { alignItems: 'center', paddingVertical: 8 },
  verExameTxt: { color: '#1A6FAF', fontSize: 15, fontWeight: '600' },

  // Vazio
  vazioCard: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  vazioTitulo: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  vazioDesc: { fontSize: 13, color: '#6B7280', textAlign: 'center', maxWidth: 260 },

  // Gráfico
  graficoSub: { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  graficoVazio: { alignItems: 'center', paddingVertical: 20 },
  graficoVazioTxt: { fontSize: 13, color: '#6B7280', textAlign: 'center' },

  // Notificações
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    minHeight: 56,
  },
  notifIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTextos: { flex: 1 },
  notifTitulo: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  notifTempo: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  notifChevron: { fontSize: 18, color: '#6B7280' },

  // Wellness
  wellnessCard: {
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  wellnessIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1D9E75',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  wellnessTextos: { marginBottom: 14 },
  wellnessTitulo: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  wellnessDesc: { fontSize: 13, color: '#374151', marginTop: 4 },
  wellnessBtn: {
    backgroundColor: '#1D9E75',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    minHeight: 44,
  },
  wellnessBtnTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
