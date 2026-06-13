import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  ChevronDown,
  GitCompare,
  TrendingDown,
  TrendingUp,
  Minus,
  Check,
  X,
  LayoutGrid,
  FileText,
} from 'lucide-react-native';
import { useAuth } from '../../../src/context/AuthContext';
import { getEstudosDoPaciente, getUrlImagemEstudo } from '../../../src/data/repository/estudos';
import { EstudoComResultado, EstadoEstudo } from '../../../src/data/types';
import { grauPorAngulo } from '../../../src/data/severidade';
import { i18n, useTranslation } from '../../../src/i18n';
import { localeDeData } from '../../../src/i18n/dateLocale';

// ─── Helpers ────────────────────────────────────────────────────────────────

function dataFormatada(iso: string): string {
  return new Date(iso).toLocaleDateString(localeDeData(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function anguloEfetivo(estudo: EstudoComResultado): number | null {
  const r = estudo.resultado;
  if (!r) return null;
  return r.angulo_cobb_corrigido ?? r.angulo_cobb ?? null;
}

type BadgeInfo = { label: string; cor: string; bgCor: string };

function estadoInfo(estado: EstadoEstudo): BadgeInfo {
  switch (estado) {
    case 'DIAGNOSED':
    case 'SENT':
      return { label: i18n.t('compararExames.estadoAnalisado'), cor: '#1D9E75', bgCor: '#DCFCE7' };
    case 'PENDING_VALIDATION':
    case 'VALIDATED':
      return { label: i18n.t('compararExames.estadoPendente'), cor: '#D97706', bgCor: '#FEF3C7' };
    case 'UPLOADED':
    case 'PROCESSING':
      return { label: i18n.t('compararExames.estadoEmAnalise'), cor: '#1A6FAF', bgCor: '#EFF6FF' };
    case 'ARCHIVED':
      return { label: i18n.t('compararExames.estadoArquivado'), cor: '#6B7280', bgCor: '#F3F4F6' };
  }
}

// Classification is derived from the effective angle (corrected ?? ML), not from
// the stored `grau_curvatura`, which goes stale after a doctor corrects the angle.
function classifInfo(angulo: number | null | undefined): BadgeInfo | null {
  if (angulo == null) return null;
  switch (grauPorAngulo(angulo)) {
    case 'NORMAL':   return { label: i18n.t('compararExames.classNormal'),   cor: '#1D9E75', bgCor: '#DCFCE7' };
    case 'LEVE':     return { label: i18n.t('compararExames.classLeve'),     cor: '#D97706', bgCor: '#FEF3C7' };
    case 'MODERADA': return { label: i18n.t('compararExames.classModerada'), cor: '#E8843C', bgCor: '#FEF0E7' };
    case 'GRAVE':    return { label: i18n.t('compararExames.classGrave'),    cor: '#EF4444', bgCor: '#FEE2E2' };
  }
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Ecrã principal ──────────────────────────────────────────────────────────

export default function CompararExamesScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { utilizador } = useAuth();
  const { t } = useTranslation();

  const [estudos, setEstudos] = useState<EstudoComResultado[]>([]);
  const [urlsImagens, setUrlsImagens] = useState<Record<string, string>>({});
  const [aCarregar, setACarregar] = useState(true);
  const [erroDados, setErroDados] = useState<string | null>(null);

  const [idA, setIdA] = useState<string | null>(null);
  const [idB, setIdB] = useState<string | null>(null);
  // Coluna cujo seletor está aberto ('A' | 'B' | null)
  const [seletorAberto, setSeletorAberto] = useState<'A' | 'B' | null>(null);
  const [urlRaioX, setUrlRaioX] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!utilizador) return;
    setErroDados(null);
    setACarregar(true);
    try {
      const dados = await getEstudosDoPaciente(utilizador.id);
      setEstudos(dados);

      // Seleção por defeito: A = exame de origem (param `from`), B = o anterior.
      if (dados.length >= 2) {
        const idxFrom = from ? dados.findIndex((e) => e.id === from) : -1;
        const idxA = idxFrom >= 0 ? idxFrom : 0;
        // `dados` está ordenado por data desc → o "anterior" é o índice seguinte.
        const idxB = idxA + 1 < dados.length ? idxA + 1 : (idxA === 0 ? 1 : 0);
        setIdA(dados[idxA].id);
        setIdB(dados[idxB].id);
      }

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
    } catch {
      setErroDados(t('compararExames.erroCarregar'));
    } finally {
      setACarregar(false);
    }
  }, [utilizador, from]);

  useEffect(() => { carregar(); }, [carregar]);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/exams' as never);
  }

  const estudoA = estudos.find((e) => e.id === idA) ?? null;
  const estudoB = estudos.find((e) => e.id === idB) ?? null;

  // Delta do ângulo de Cobb: B (mais antigo) → A (mais recente).
  const anguloA = estudoA ? anguloEfetivo(estudoA) : null;
  const anguloB = estudoB ? anguloEfetivo(estudoB) : null;
  const delta = anguloA != null && anguloB != null ? anguloA - anguloB : null;

  function escolherExame(id: string) {
    if (seletorAberto === 'A') {
      // Evita ter o mesmo exame nas duas colunas.
      if (id === idB) setIdB(idA);
      setIdA(id);
    } else if (seletorAberto === 'B') {
      if (id === idA) setIdA(idB);
      setIdB(id);
    }
    setSeletorAberto(null);
  }

  const idSelecionadoNoSeletor = seletorAberto === 'A' ? idA : idB;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.btnVoltar}
          onPress={voltar}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo} numberOfLines={1}>
          {t('compararExames.headerTitulo')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {aCarregar ? (
        <ActivityIndicator size="large" color="#1A6FAF" style={{ marginTop: 60 }} />
      ) : erroDados ? (
        <View style={styles.vazio}>
          <Text style={styles.erroTxt}>{erroDados}</Text>
          <TouchableOpacity style={styles.btnRetry} onPress={carregar}>
            <Text style={styles.btnRetryTxt}>{t('comum.tentarNovamente')}</Text>
          </TouchableOpacity>
        </View>
      ) : estudos.length < 2 || !estudoA || !estudoB ? (
        <View style={styles.vazio}>
          <GitCompare size={48} color="#6B7280" />
          <Text style={styles.vazioTitulo}>{t('compararExames.semComparacaoTitulo')}</Text>
          <Text style={styles.vazioDesc}>{t('compararExames.semComparacaoDesc')}</Text>
          <TouchableOpacity
            style={styles.btnVerExames}
            onPress={() => router.replace('/(tabs)/exams' as never)}
            activeOpacity={0.85}
          >
            <Text style={styles.btnVerExamesTxt}>{t('compararExames.verExames')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Card do delta ─────────────────────────────────────────── */}
          <View style={styles.deltaCard}>
            <View
              style={[
                styles.deltaBadge,
                {
                  backgroundColor:
                    delta == null ? '#F3F4F6' : delta <= 0 ? '#DCFCE7' : '#FEE2E2',
                },
              ]}
            >
              {delta == null ? (
                <Minus size={18} color="#6B7280" />
              ) : delta < 0 ? (
                <TrendingDown size={18} color="#1D9E75" />
              ) : delta > 0 ? (
                <TrendingUp size={18} color="#EF4444" />
              ) : (
                <Minus size={18} color="#6B7280" />
              )}
              <Text
                style={[
                  styles.deltaValor,
                  {
                    color:
                      delta == null || delta === 0
                        ? '#6B7280'
                        : delta < 0
                        ? '#1D9E75'
                        : '#EF4444',
                  },
                ]}
              >
                {delta == null
                  ? t('compararExames.semAngulo')
                  : `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta).toFixed(1)}°`}
              </Text>
            </View>
            <Text
              style={[
                styles.deltaDesc,
                {
                  color:
                    delta == null || delta === 0
                      ? '#6B7280'
                      : delta < 0
                      ? '#1D9E75'
                      : '#EF4444',
                },
              ]}
            >
              {delta == null
                ? t('compararExames.deltaIndisponivel')
                : delta < 0
                ? t('compararExames.deltaMelhoria', { valor: Math.abs(delta).toFixed(1) })
                : delta > 0
                ? t('compararExames.deltaPiora', { valor: Math.abs(delta).toFixed(1) })
                : t('compararExames.deltaIgual')}
            </Text>
            <Text style={styles.deltaDisclaimer}>
              {t('compararExames.deltaDisclaimer')}
            </Text>
          </View>

          {/* ── Seletores A/B com ícone GitCompare no centro ───────── */}
          <View style={styles.seletoresRow}>
            {/* Coluna A */}
            <View style={styles.seletorColuna}>
              <Text style={styles.colunaRotulo}>{t('compararExames.colunaA')}</Text>
              <TouchableOpacity
                style={styles.seletor}
                onPress={() => setSeletorAberto('A')}
                activeOpacity={0.7}
              >
                <Text style={styles.seletorTxt} numberOfLines={1}>
                  {dataFormatada(estudoA.data_estudo)}
                </Text>
                <ChevronDown size={14} color="#1A6FAF" />
              </TouchableOpacity>
            </View>

            {/* Ícone central */}
            <View style={styles.seletorIconeWrap}>
              <GitCompare size={18} color="#6B7280" />
            </View>

            {/* Coluna B */}
            <View style={styles.seletorColuna}>
              <Text style={[styles.colunaRotulo, { textAlign: 'right' }]}>
                {t('compararExames.colunaB')}
              </Text>
              <TouchableOpacity
                style={styles.seletor}
                onPress={() => setSeletorAberto('B')}
                activeOpacity={0.7}
              >
                <Text style={styles.seletorTxt} numberOfLines={1}>
                  {dataFormatada(estudoB.data_estudo)}
                </Text>
                <ChevronDown size={14} color="#1A6FAF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Miniaturas lado a lado com overlay COBB ───────────── */}
          <View style={styles.radiografiasRow}>
            {/* Miniatura A */}
            <TouchableOpacity
              style={styles.radiografiaWrap}
              onPress={urlsImagens[estudoA.id] ? () => setUrlRaioX(urlsImagens[estudoA.id] ?? null) : undefined}
              activeOpacity={urlsImagens[estudoA.id] ? 0.85 : 1}
            >
              {urlsImagens[estudoA.id] ? (
                <>
                  <Image
                    source={{ uri: urlsImagens[estudoA.id] }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                  {anguloA != null && (
                    <View style={styles.cobbOverlay}>
                      <Text style={styles.cobbOverlayTxt}>
                        {`${anguloA.toFixed(1)}° COBB`}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.radiografiaTxt}>{t('compararExames.semRadiografia')}</Text>
              )}
            </TouchableOpacity>

            {/* Miniatura B */}
            <TouchableOpacity
              style={styles.radiografiaWrap}
              onPress={urlsImagens[estudoB.id] ? () => setUrlRaioX(urlsImagens[estudoB.id] ?? null) : undefined}
              activeOpacity={urlsImagens[estudoB.id] ? 0.85 : 1}
            >
              {urlsImagens[estudoB.id] ? (
                <>
                  <Image
                    source={{ uri: urlsImagens[estudoB.id] }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                  {anguloB != null && (
                    <View style={styles.cobbOverlay}>
                      <Text style={styles.cobbOverlayTxt}>
                        {`${anguloB.toFixed(1)}° COBB`}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.radiografiaTxt}>{t('compararExames.semRadiografia')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Card "Comparação de métricas" ──────────────────────── */}
          <View style={styles.metricasCard}>
            {/* Cabeçalho */}
            <View style={styles.metricasHeader}>
              <View style={styles.metricasTituloRow}>
                <LayoutGrid size={16} color="#1A1A2E" />
                <Text style={styles.metricasTituloTxt}>{t('compararExames.metricasTitulo')}</Text>
              </View>
              <View style={styles.metricasHeaderCols}>
                <Text style={styles.metricasHeaderCol}>{t('compararExames.colunaA')}</Text>
                <Text style={styles.metricasHeaderSep}>|</Text>
                <Text style={styles.metricasHeaderCol}>{t('compararExames.colunaB')}</Text>
              </View>
            </View>

            <View style={styles.metricasSeparador} />

            {/* Linha: Ângulo Cobb */}
            <View style={styles.metricaLinha}>
              <Text style={styles.metricaLinhaLabel}>{t('compararExames.anguloCobb')}</Text>
              <View style={styles.metricaLinhaValores}>
                {/* Valor A — verde se melhor (menor) */}
                <Text
                  style={[
                    styles.metricaCobbValor,
                    {
                      color:
                        anguloA != null && anguloB != null
                          ? anguloA <= anguloB
                            ? '#1D9E75'
                            : '#EF4444'
                          : '#1A1A2E',
                    },
                  ]}
                >
                  {anguloA != null ? `${anguloA.toFixed(1)}°` : t('compararExames.semAngulo')}
                </Text>

                {/* Seta indicadora */}
                <View style={styles.metricaSetaWrap}>
                  {delta != null && delta !== 0 ? (
                    delta < 0 ? (
                      <TrendingDown size={14} color="#1D9E75" />
                    ) : (
                      <TrendingUp size={14} color="#EF4444" />
                    )
                  ) : (
                    <Minus size={14} color="#6B7280" />
                  )}
                </View>

                {/* Valor B */}
                <Text
                  style={[
                    styles.metricaCobbValor,
                    {
                      color:
                        anguloA != null && anguloB != null
                          ? anguloB <= anguloA
                            ? '#1D9E75'
                            : '#EF4444'
                          : '#1A1A2E',
                    },
                  ]}
                >
                  {anguloB != null ? `${anguloB.toFixed(1)}°` : t('compararExames.semAngulo')}
                </Text>
              </View>
            </View>

            <View style={styles.metricasSeparador} />

            {/* Linha: Estado */}
            {(() => {
              const eA = estadoInfo(estudoA.estado);
              const eB = estadoInfo(estudoB.estado);
              return (
                <View style={styles.metricaLinha}>
                  <Text style={styles.metricaLinhaLabel}>{t('compararExames.estado')}</Text>
                  <View style={styles.metricaLinhaValores}>
                    <View style={[styles.badge, { backgroundColor: eA.bgCor }]}>
                      <Text style={[styles.badgeTxt, { color: eA.cor }]} numberOfLines={1}>
                        {eA.label}
                      </Text>
                    </View>
                    <View style={styles.metricaPonto}>
                      <View style={styles.metricaPontoCirculo} />
                    </View>
                    <View style={[styles.badge, { backgroundColor: eB.bgCor }]}>
                      <Text style={[styles.badgeTxt, { color: eB.cor }]} numberOfLines={1}>
                        {eB.label}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })()}

            <View style={styles.metricasSeparador} />

            {/* Linha: Classificação */}
            {(() => {
              const cA = classifInfo(anguloEfetivo(estudoA));
              const cB = classifInfo(anguloEfetivo(estudoB));
              return (
                <View style={styles.metricaLinha}>
                  <Text style={styles.metricaLinhaLabel}>{t('compararExames.classificacao')}</Text>
                  <View style={styles.metricaLinhaValores}>
                    {cA ? (
                      <View style={[styles.badge, { backgroundColor: cA.bgCor }]}>
                        <Text style={[styles.badgeTxt, { color: cA.cor }]} numberOfLines={1}>
                          {cA.label}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.metricaSemValor}>{t('compararExames.semAngulo')}</Text>
                    )}
                    <View style={styles.metricaPonto}>
                      <View style={styles.metricaPontoCirculo} />
                    </View>
                    {cB ? (
                      <View style={[styles.badge, { backgroundColor: cB.bgCor }]}>
                        <Text style={[styles.badgeTxt, { color: cB.cor }]} numberOfLines={1}>
                          {cB.label}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.metricaSemValor}>{t('compararExames.semAngulo')}</Text>
                    )}
                  </View>
                </View>
              );
            })()}

            <View style={styles.metricasSeparador} />

            {/* Linha: Data */}
            <View style={styles.metricaLinha}>
              <Text style={styles.metricaLinhaLabel}>{t('compararExames.data')}</Text>
              <View style={styles.metricaLinhaValores}>
                <Text style={styles.metricaDataValor} numberOfLines={1}>
                  {dataFormatada(estudoA.data_estudo)}
                </Text>
                <View style={styles.metricaPonto}>
                  <View style={styles.metricaPontoCirculo} />
                </View>
                <Text style={styles.metricaDataValor} numberOfLines={1}>
                  {dataFormatada(estudoB.data_estudo)}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Card "Notas clínicas" ──────────────────────────────── */}
          <View style={styles.notasCard}>
            {/* Cabeçalho */}
            <View style={styles.notasHeader}>
              <FileText size={16} color="#1A1A2E" />
              <Text style={styles.notasTitulo}>{t('compararExames.notasTitulo')}</Text>
            </View>

            <View style={styles.notasColunas}>
              {/* Notas A */}
              <View style={styles.notasColuna}>
                <Text style={styles.notasRotulo}>{t('compararExames.colunaA')}</Text>
                <Text style={styles.notasData}>{dataFormatada(estudoA.data_estudo)}</Text>
                {estudoA.resultado?.observacoes_medico ? (
                  <Text style={styles.notasTexto}>
                    {estudoA.resultado.observacoes_medico}
                  </Text>
                ) : (
                  <Text style={styles.notasSemNotas}>{t('compararExames.semNotas')}</Text>
                )}
              </View>

              {/* Divisor vertical */}
              <View style={styles.notasDivisor} />

              {/* Notas B */}
              <View style={styles.notasColuna}>
                <Text style={styles.notasRotulo}>{t('compararExames.colunaB')}</Text>
                <Text style={styles.notasData}>{dataFormatada(estudoB.data_estudo)}</Text>
                {estudoB.resultado?.observacoes_medico ? (
                  <Text style={styles.notasTexto}>
                    {estudoB.resultado.observacoes_medico}
                  </Text>
                ) : (
                  <Text style={styles.notasSemNotas}>{t('compararExames.semNotas')}</Text>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Modal de seleção de exame */}
      <Modal
        visible={seletorAberto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSeletorAberto(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSeletorAberto(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>{t('compararExames.modalTitulo')}</Text>
              <TouchableOpacity
                onPress={() => setSeletorAberto(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalLista} showsVerticalScrollIndicator={false}>
              {estudos.map((e) => {
                const selecionado = e.id === idSelecionadoNoSeletor;
                const angulo = anguloEfetivo(e);
                const estado = estadoInfo(e.estado);
                return (
                  <TouchableOpacity
                    key={e.id}
                    style={[styles.modalLinha, selecionado && styles.modalLinhaAtiva]}
                    onPress={() => escolherExame(e.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLinhaData}>{dataFormatada(e.data_estudo)}</Text>
                      <Text style={styles.modalLinhaCobb}>
                        {t('compararExames.anguloCobb')}:{' '}
                        {angulo != null ? `${angulo.toFixed(1)}°` : t('compararExames.semAngulo')}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: estado.bgCor }]}>
                      <Text style={[styles.badgeTxt, { color: estado.cor }]} numberOfLines={1}>
                        {estado.label}
                      </Text>
                    </View>
                    {selecionado && <Check size={18} color="#1A6FAF" style={{ marginLeft: 8 }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal fullscreen do raio-X */}
      <Modal
        visible={urlRaioX !== null}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setUrlRaioX(null)}
      >
        <View style={styles.rxModal}>
          <View style={styles.rxHeader}>
            <TouchableOpacity
              onPress={() => setUrlRaioX(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.rxFechar}
            >
              <X size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.rxTitulo}>{t('compararExames.rxTitulo')}</Text>
            <View style={{ width: 42 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.rxScrollContent}
            maximumZoomScale={5}
            minimumZoomScale={1}
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            bouncesZoom
          >
            {urlRaioX && (
              <Image
                source={{ uri: urlRaioX }}
                style={{ width: SCREEN_W, height: SCREEN_H * 0.82 }}
                resizeMode="contain"
              />
            )}
          </ScrollView>

          <View style={styles.rxRodape}>
            <Text style={styles.rxRodapeTxt}>{t('compararExames.rxRodape')}</Text>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 12,
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
  headerTitulo: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
  },

  scroll: { padding: 16, paddingBottom: 40, gap: 16 },

  // ── Delta card ──────────────────────────────────────────────────────────────
  deltaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'flex-start',
    gap: 6,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  deltaValor: { fontSize: 22, fontWeight: '800' },
  deltaDesc: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  deltaDisclaimer: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: 17,
    marginTop: 2,
  },

  // ── Seletores ───────────────────────────────────────────────────────────────
  seletoresRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 0,
  },
  seletorColuna: {
    flex: 1,
    gap: 4,
  },
  seletorIconeWrap: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 13,
  },
  colunaRotulo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A6FAF',
    letterSpacing: 0.5,
  },
  seletor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  seletorTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1A6FAF' },

  // ── Radiografias ────────────────────────────────────────────────────────────
  radiografiasRow: {
    flexDirection: 'row',
    gap: 12,
  },
  radiografiaWrap: {
    flex: 1,
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiografiaTxt: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  cobbOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  cobbOverlayTxt: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Card métricas ───────────────────────────────────────────────────────────
  metricasCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  metricasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metricasTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricasTituloTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  metricasHeaderCols: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricasHeaderCol: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A6FAF',
    letterSpacing: 0.4,
  },
  metricasHeaderSep: {
    fontSize: 11,
    color: '#D1D5DB',
    fontWeight: '400',
  },
  metricasSeparador: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  metricaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  metricaLinhaLabel: {
    width: 90,
    fontSize: 13,
    color: '#6B7280',
    flexShrink: 0,
  },
  metricaLinhaValores: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  metricaCobbValor: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 52,
    textAlign: 'center',
  },
  metricaSetaWrap: {
    width: 20,
    alignItems: 'center',
  },
  metricaPonto: {
    width: 20,
    alignItems: 'center',
  },
  metricaPontoCirculo: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  metricaDataValor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A2E',
    flex: 1,
    textAlign: 'center',
  },
  metricaSemValor: {
    fontSize: 13,
    color: '#6B7280',
  },

  // ── Card notas clínicas ─────────────────────────────────────────────────────
  notasCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    gap: 12,
  },
  notasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notasTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  notasColunas: {
    flexDirection: 'row',
    gap: 0,
  },
  notasColuna: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 4,
  },
  notasDivisor: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  notasRotulo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A6FAF',
    letterSpacing: 0.5,
  },
  notasData: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  notasTexto: {
    fontSize: 13,
    color: '#1A1A2E',
    lineHeight: 19,
  },
  notasSemNotas: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: 19,
  },

  // ── Badges ──────────────────────────────────────────────────────────────────
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  // ── Estados (vazio / erro) ──────────────────────────────────────────────────
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  vazioTitulo: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  vazioDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21 },
  btnVerExames: {
    backgroundColor: '#1A6FAF',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#1A6FAF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  btnVerExamesTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  erroTxt: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  btnRetry: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  btnRetryTxt: { color: '#1A6FAF', fontWeight: '600', fontSize: 14 },

  // ── Modal de seleção ────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '70%',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  modalLista: { flexGrow: 0 },
  modalLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    minHeight: 44,
  },
  modalLinhaAtiva: { backgroundColor: '#EFF6FF' },
  modalLinhaData: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  modalLinhaCobb: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // ── Modal raio-X fullscreen ─────────────────────────────────────────────────
  rxModal: { flex: 1, backgroundColor: '#000000' },
  rxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
  },
  rxFechar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 21,
  },
  rxTitulo: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  rxScrollContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rxRodape: { paddingVertical: 14, alignItems: 'center' },
  rxRodapeTxt: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
});
