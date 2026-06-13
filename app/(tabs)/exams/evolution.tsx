import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Minus,
  X,
} from 'lucide-react-native';
import Svg, { Path, Polyline, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { useAuth } from '../../../src/context/AuthContext';
import { getEstudosDoPaciente } from '../../../src/data/repository/estudos';
import { EstudoComResultado } from '../../../src/data/types';
import { anguloEfetivo } from '../../../src/data/severidade';
import { i18n, useTranslation } from '../../../src/i18n';
import { localeDeData } from '../../../src/i18n/dateLocale';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dataExame(iso: string): string {
  return new Date(iso).toLocaleDateString(localeDeData(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function xLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

type TendInfo = { label: string; cor: string; icone: React.ReactNode };

function tendenciaInfo(tendencia: string | null): TendInfo {
  if (tendencia === 'MELHORIA')
    return { label: i18n.t('evolucao.tendMelhoria'), cor: '#1D9E75', icone: <TrendingDown size={12} color="#1D9E75" /> };
  if (tendencia === 'AGRAVAMENTO')
    return { label: i18n.t('evolucao.tendAgravamento'), cor: '#EF4444', icone: <TrendingUp size={12} color="#EF4444" /> };
  if (tendencia === 'ESTAVEL')
    return { label: i18n.t('evolucao.tendEstavel'), cor: '#F59E0B', icone: <Minus size={12} color="#F59E0B" /> };
  return { label: '—', cor: '#6B7280', icone: <Minus size={12} color="#6B7280" /> };
}

// ─── Gráfico SVG ──────────────────────────────────────────────────────────────

interface GraficoProps {
  dados: EstudoComResultado[];
  selecionado: EstudoComResultado | null;
  onPress: (e: EstudoComResultado) => void;
  chartWidth: number;
}

function GraficoEvolucao({ dados, selecionado, onPress, chartWidth }: GraficoProps) {
  const H = 210;
  const PAD_L = 44;
  const PAD_R = 16;
  const PAD_T = 24;
  const PAD_B = 32;
  const W = chartWidth;

  if (dados.length === 0) {
    return (
      <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 }}>
          {i18n.t('evolucao.semDadosPeriodo')}
        </Text>
      </View>
    );
  }

  const valores = dados.map((e) => anguloEfetivo(e.resultado)!);
  const rawMin = Math.min(...valores);
  const rawMax = Math.max(...valores);
  const range = rawMax - rawMin;
  const margin = Math.max(range * 0.25, 4);
  const minY = Math.max(0, rawMin - margin);
  const maxY = rawMax + margin;
  const rangeY = maxY - minY || 1;

  function xPx(i: number): number {
    if (dados.length <= 1) return PAD_L + (W - PAD_L - PAD_R) / 2;
    return PAD_L + (i / (dados.length - 1)) * (W - PAD_L - PAD_R);
  }
  function yPx(v: number): number {
    return PAD_T + ((maxY - v) / rangeY) * (H - PAD_T - PAD_B);
  }

  const yTicksRaw = [minY, (minY + maxY) / 2, maxY];
  const yTicks = yTicksRaw
    .map(Math.round)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const linhaPoints = dados
    .map((e, i) => `${xPx(i)},${yPx(anguloEfetivo(e.resultado)!)}`)
    .join(' ');

  const areaPath =
    dados.length >= 2
      ? `M ${xPx(0)},${H - PAD_B} ` +
        dados.map((e, i) => `L ${xPx(i)},${yPx(anguloEfetivo(e.resultado)!)}`).join(' ') +
        ` L ${xPx(dados.length - 1)},${H - PAD_B} Z`
      : '';

  return (
    <Svg width={W} height={H}>
      {/* Grid lines */}
      {yTicks.map((v) => (
        <Line
          key={`g-${v}`}
          x1={PAD_L}
          y1={yPx(v)}
          x2={W - PAD_R}
          y2={yPx(v)}
          stroke="#E5E7EB"
          strokeWidth={1}
        />
      ))}
      {/* Y axis labels */}
      {yTicks.map((v) => (
        <SvgText
          key={`yl-${v}`}
          x={PAD_L - 6}
          y={yPx(v) + 4}
          fontSize={9}
          fill="#9CA3AF"
          textAnchor="end"
        >
          {v}°
        </SvgText>
      ))}
      {/* Area fill */}
      {areaPath !== '' && (
        <Path d={areaPath} fill="rgba(26, 111, 175, 0.1)" />
      )}
      {/* Line */}
      {dados.length >= 2 && (
        <Polyline
          points={linhaPoints}
          fill="none"
          stroke="#1A6FAF"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {/* X axis labels */}
      {dados.map((e, i) => (
        <SvgText
          key={`xl-${e.id}`}
          x={xPx(i)}
          y={H - 4}
          fontSize={8}
          fill="#9CA3AF"
          textAnchor="middle"
        >
          {xLabel(e.data_estudo)}
        </SvgText>
      ))}
      {/* Interactive points */}
      {dados.map((e, i) => {
        const sel = selecionado?.id === e.id;
        const cx = xPx(i);
        const cy = yPx(anguloEfetivo(e.resultado)!);
        return (
          <G key={e.id}>
            {/* Large transparent touch target */}
            <Circle cx={cx} cy={cy} r={22} fill="transparent" onPress={() => onPress(e)} />
            {/* Visual circle */}
            <Circle
              cx={cx}
              cy={cy}
              r={sel ? 7 : 5}
              fill={sel ? '#1A6FAF' : '#FFFFFF'}
              stroke="#1A6FAF"
              strokeWidth={sel ? 0 : 2}
              onPress={() => onPress(e)}
            />
            {/* Value label when selected */}
            {sel && (
              <SvgText
                x={cx}
                y={cy - 14}
                fontSize={10}
                fill="#1A6FAF"
                textAnchor="middle"
              >
                {anguloEfetivo(e.resultado)!.toFixed(1)}°
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Ecrã principal ───────────────────────────────────────────────────────────

export default function EvolutionScreen() {
  const { utilizador } = useAuth();
  const { t } = useTranslation();
  const PERIODOS = [
    { val: '6m' as const, label: t('evolucao.periodo6m') },
    { val: '1a' as const, label: t('evolucao.periodo1a') },
    { val: 'tudo' as const, label: t('evolucao.periodoTudo') },
  ];
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = windowWidth - 32;

  const [estudos, setEstudos] = useState<EstudoComResultado[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [periodo, setPeriodo] = useState<'6m' | '1a' | 'tudo'>('tudo');
  const [exameSelecionado, setExameSelecionado] = useState<EstudoComResultado | null>(null);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');
  const [filtroPeriodoCustom, setFiltroPeriodoCustom] = useState<{
    inicio: string;
    fim: string;
  } | null>(null);

  const carregar = useCallback(async () => {
    if (!utilizador) return;
    try {
      const dados = await getEstudosDoPaciente(utilizador.id);
      setEstudos(dados);
    } finally {
      setACarregar(false);
    }
  }, [utilizador]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const dadosFiltrados = useMemo(() => {
    const comResultado = estudos
      .filter((e) => e.estado === 'SENT' && anguloEfetivo(e.resultado) != null)
      .slice()
      .sort((a, b) => new Date(a.data_estudo).getTime() - new Date(b.data_estudo).getTime());

    if (filtroPeriodoCustom) {
      const inicio = new Date(filtroPeriodoCustom.inicio + 'T00:00:00');
      const fim = new Date(filtroPeriodoCustom.fim + 'T23:59:59');
      return comResultado.filter((e) => {
        const d = new Date(e.data_estudo);
        return d >= inicio && d <= fim;
      });
    }

    const agora = new Date();
    if (periodo === '6m') {
      const limite = new Date(agora);
      limite.setMonth(limite.getMonth() - 6);
      return comResultado.filter((e) => new Date(e.data_estudo) >= limite);
    }
    if (periodo === '1a') {
      const limite = new Date(agora);
      limite.setFullYear(limite.getFullYear() - 1);
      return comResultado.filter((e) => new Date(e.data_estudo) >= limite);
    }
    return comResultado;
  }, [estudos, periodo, filtroPeriodoCustom]);

  useEffect(() => {
    setExameSelecionado(dadosFiltrados[dadosFiltrados.length - 1] ?? null);
  }, [dadosFiltrados]);

  function aplicarFiltro() {
    if (!filtroInicio || !filtroFim) return;
    setFiltroPeriodoCustom({ inicio: filtroInicio, fim: filtroFim });
    setModalVisivel(false);
  }

  function limparFiltro() {
    setFiltroPeriodoCustom(null);
    setFiltroInicio('');
    setFiltroFim('');
    setModalVisivel(false);
  }

  const tendInfo = tendenciaInfo(exameSelecionado?.resultado?.tendencia_evolucao ?? null);

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
        <Text style={styles.titulo}>{t('evolucao.titulo')}</Text>
        <TouchableOpacity
          style={styles.btnFiltroIcon}
          onPress={() => setModalVisivel(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <SlidersHorizontal
            size={20}
            color={filtroPeriodoCustom !== null ? '#1A6FAF' : '#1A1A2E'}
          />
        </TouchableOpacity>
      </View>

      {/* Period filter tabs */}
      <View style={styles.tabsRow}>
        {PERIODOS.map(({ val, label }) => (
          <TouchableOpacity
            key={val}
            style={[
              styles.tab,
              periodo === val && !filtroPeriodoCustom && styles.tabAtivo,
            ]}
            onPress={() => {
              setPeriodo(val);
              setFiltroPeriodoCustom(null);
            }}
          >
            <Text
              style={[
                styles.tabTxt,
                periodo === val && !filtroPeriodoCustom && styles.tabTxtAtivo,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {aCarregar ? (
        <ActivityIndicator size="large" color="#1A6FAF" style={{ marginTop: 48 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Chart */}
          <View style={styles.graficoContainer}>
            <GraficoEvolucao
              dados={dadosFiltrados}
              selecionado={exameSelecionado}
              onPress={setExameSelecionado}
              chartWidth={chartWidth}
            />
          </View>

          {/* Hint */}
          {dadosFiltrados.length > 1 && (
            <Text style={styles.hint}>
              {t('evolucao.hint')}
            </Text>
          )}

          {/* Selected exam card */}
          {exameSelecionado?.resultado && (
            <View style={styles.cardExame}>
              <View style={styles.cardTopo}>
                <Text style={styles.cardData}>{dataExame(exameSelecionado.data_estudo)}</Text>
                <View style={[styles.tendBadge, { borderColor: tendInfo.cor }]}>
                  {tendInfo.icone}
                  <Text style={[styles.tendTxt, { color: tendInfo.cor }]}>
                    {tendInfo.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.cobbLabel}>{t('evolucao.anguloCobb')}</Text>
              <Text style={styles.cobbValor}>
                {anguloEfetivo(exameSelecionado.resultado)!.toFixed(1)}°
              </Text>

              {(exameSelecionado.resultado.descricao_clinica ||
                exameSelecionado.resultado.observacoes_medico) && (
                <Text style={styles.notaClinica} numberOfLines={5}>
                  {exameSelecionado.resultado.descricao_clinica ??
                    exameSelecionado.resultado.observacoes_medico}
                </Text>
              )}

              <TouchableOpacity
                style={styles.btnVerExame}
                onPress={() =>
                  router.push(`/(tabs)/exams/${exameSelecionado.id}` as never)
                }
                activeOpacity={0.8}
              >
                <Text style={styles.btnVerExameTxt}>{t('evolucao.verExameCompleto')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {dadosFiltrados.length === 0 && (
            <View style={styles.vazio}>
              <Text style={styles.vazioTitulo}>{t('evolucao.vazioTitulo')}</Text>
              <Text style={styles.vazioDesc}>
                {t('evolucao.vazioDesc')}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Filter modal */}
      <Modal
        visible={modalVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisivel(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisivel(false)}>
          <Pressable style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>{t('evolucao.filtroTitulo')}</Text>
              <TouchableOpacity
                onPress={() => setModalVisivel(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('evolucao.dataInicio')}</Text>
            <TextInput
              style={styles.modalInput}
              value={filtroInicio}
              onChangeText={setFiltroInicio}
              placeholder={t('evolucao.dataPlaceholder')}
              placeholderTextColor="#9CA3AF"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.inputLabel}>{t('evolucao.dataFim')}</Text>
            <TextInput
              style={styles.modalInput}
              value={filtroFim}
              onChangeText={setFiltroFim}
              placeholder={t('evolucao.dataPlaceholder')}
              placeholderTextColor="#9CA3AF"
              keyboardType="numbers-and-punctuation"
            />

            <TouchableOpacity
              style={[
                styles.btnAplicar,
                (!filtroInicio || !filtroFim) && styles.btnAplicarDisabled,
              ]}
              onPress={aplicarFiltro}
              disabled={!filtroInicio || !filtroFim}
            >
              <Text style={styles.btnAplicarTxt}>{t('evolucao.aplicarFiltro')}</Text>
            </TouchableOpacity>

            {filtroPeriodoCustom && (
              <TouchableOpacity style={styles.btnLimpar} onPress={limparFiltro}>
                <Text style={styles.btnLimparTxt}>{t('evolucao.removerFiltro')}</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

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
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    flex: 1,
    textAlign: 'center',
  },
  btnFiltroIcon: {
    width: 40,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  tabAtivo: { backgroundColor: '#1A6FAF' },
  tabTxt: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTxtAtivo: { color: '#FFFFFF' },

  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  graficoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    overflow: 'hidden',
  },

  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
    lineHeight: 18,
  },

  cardExame: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  cardData: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', flex: 1 },
  tendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tendTxt: { fontSize: 11, fontWeight: '600' },
  cobbLabel: { fontSize: 12, color: '#6B7280' },
  cobbValor: { fontSize: 38, fontWeight: '800', color: '#1A1A2E', marginBottom: 10 },
  notaClinica: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  btnVerExame: {
    backgroundColor: '#1A6FAF',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnVerExameTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  vazio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  vazioTitulo: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  vazioDesc: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A2E',
    marginBottom: 14,
  },
  btnAplicar: {
    backgroundColor: '#1A6FAF',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  btnAplicarDisabled: { opacity: 0.45 },
  btnAplicarTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  btnLimpar: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnLimparTxt: { color: '#EF4444', fontWeight: '600', fontSize: 14 },
});
