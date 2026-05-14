import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Download,
  GitCompare,
  Info,
  Cpu,
} from 'lucide-react-native';
import { getEstudoPorId, getUrlRelatorioPdf } from '../../../src/data/repository/estudos';
import { EstudoDetalhe, EstadoEstudo } from '../../../src/data/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function dataFormatada(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function dataFormatadaLonga(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function bandaSeveridade(angulo: number): string {
  if (angulo < 10) return 'Um ângulo de ' + angulo.toFixed(1) + '° está dentro do intervalo normal.';
  if (angulo <= 25) return `Um ângulo de ${angulo.toFixed(1)}° indica uma curvatura espinhal ligeira.`;
  if (angulo <= 40) return `Um ângulo de ${angulo.toFixed(1)}° indica uma curvatura espinhal moderada.`;
  return `Um ângulo de ${angulo.toFixed(1)}° indica uma curvatura espinhal grave.`;
}

type EstadoInfo = { label: string; cor: string; bgCor: string };

function estadoInfo(estado: EstadoEstudo): EstadoInfo {
  switch (estado) {
    case 'DIAGNOSED':
    case 'SENT':
      return { label: 'Analisado', cor: '#1D9E75', bgCor: '#DCFCE7' };
    case 'PENDING_VALIDATION':
    case 'VALIDATED':
      return { label: 'Pendente', cor: '#D97706', bgCor: '#FEF3C7' };
    case 'UPLOADED':
    case 'PROCESSING':
      return { label: 'Em análise', cor: '#1A6FAF', bgCor: '#EFF6FF' };
    case 'ARCHIVED':
      return { label: 'Arquivado', cor: '#6B7280', bgCor: '#F3F4F6' };
  }
}

// ─── Linha de métrica ────────────────────────────────────────────────────────

function MetricaBox({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.metricaBox}>
      <Text style={styles.metricaLabel}>{label}</Text>
      <Text style={styles.metricaValor}>{valor}</Text>
    </View>
  );
}

// ─── Ecrã principal ──────────────────────────────────────────────────────────

export default function ExameDetalheScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const [estudo, setEstudo] = useState<EstudoDetalhe | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  const [erroDados, setErroDados] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!id) return;
    try {
      const dados = await getEstudoPorId(id);
      setEstudo(dados);
    } catch {
      setErroDados('Não foi possível carregar o exame. Tente novamente.');
    } finally {
      setACarregar(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  async function abrirPdf() {
    if (!estudo?.ficheiro_pdf) return;
    try {
      const url = await getUrlRelatorioPdf(estudo.ficheiro_pdf);
      if (!url) { Alert.alert('Erro', 'Não foi possível gerar o link do relatório.'); return; }
      const suportado = await Linking.canOpenURL(url);
      if (suportado) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o relatório PDF.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o relatório PDF.');
    }
  }

  const resultado = estudo?.resultado;
  const anguloEfetivo = resultado?.angulo_cobb_corrigido ?? resultado?.angulo_cobb;
  const estadoInf = estudo ? estadoInfo(estudo.estado) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.btnVoltar}
          onPress={() =>
            from === 'home'
              ? router.replace('/(tabs)/home' as never)
              : router.replace('/(tabs)/exams' as never)
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo} numberOfLines={1}>
          {estudo ? `Exame — ${dataFormatada(estudo.data_estudo)}` : 'Exame'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {aCarregar ? (
        <ActivityIndicator size="large" color="#1A6FAF" style={{ marginTop: 60 }} />
      ) : erroDados ? (
        <View style={styles.vazio}>
          <Text style={styles.erroTxt}>{erroDados}</Text>
          <TouchableOpacity style={styles.btnRetry} onPress={carregar}>
            <Text style={styles.btnRetryTxt}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : !estudo ? (
        <View style={styles.vazio}>
          <Text style={styles.erroTxt}>Exame não encontrado.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Área da radiografia */}
          <View style={styles.radiografiaWrap}>
            <View style={styles.radiografia}>
              <Text style={styles.radiografiaTxt}>RADIOGRAFIA</Text>
            </View>
            <View style={styles.iaTag}>
              <Cpu size={11} color="#1A6FAF" />
              <Text style={styles.iaTxt}>Análise IA</Text>
            </View>
            {estadoInf && (
              <View style={[styles.estadoTag, { backgroundColor: estadoInf.bgCor }]}>
                <Text style={[styles.estadoTagTxt, { color: estadoInf.cor }]}>
                  {estadoInf.label}
                </Text>
              </View>
            )}
          </View>

          {/* Métricas clínicas */}
          <View style={styles.seccao}>
            <Text style={styles.seccaoTitulo}>Métricas clínicas</Text>

            {resultado ? (
              <>
                <View style={styles.cobbRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cobbLabel}>Ângulo de Cobb</Text>
                    <Text style={styles.cobbValor}>
                      {anguloEfetivo != null ? `${anguloEfetivo.toFixed(1)}°` : '—'}
                    </Text>
                    {resultado.localizacao_curva && (
                      <Text style={styles.cobbSub}>{resultado.localizacao_curva}</Text>
                    )}
                  </View>
                  {resultado.angulo_cobb_corrigido != null && (
                    <View style={styles.corrigidoBadge}>
                      <Text style={styles.corrigidoTxt}>Corrigido</Text>
                    </View>
                  )}
                </View>

                <View style={styles.metricasGrid}>
                  <MetricaBox
                    label="Vértebra apical"
                    valor={resultado.nivel_vertebras ?? '—'}
                  />
                  <MetricaBox
                    label="Sinal de Risser"
                    valor={
                      resultado.classificacao_risser != null
                        ? `${resultado.classificacao_risser}/5`
                        : '—'
                    }
                  />
                </View>

                {anguloEfetivo != null && (
                  <View style={styles.infoBox}>
                    <Info size={14} color="#1A6FAF" />
                    <Text style={styles.infoTxt}>
                      {bandaSeveridade(anguloEfetivo)}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.semDados}>Sem métricas disponíveis para este exame.</Text>
            )}
          </View>

          {/* Observações do médico */}
          <View style={styles.seccao}>
            <Text style={styles.seccaoTitulo}>Observações do médico</Text>

            {resultado?.observacoes_medico ? (
              <>
                <Text style={styles.notasTxt}>{resultado.observacoes_medico}</Text>

                {estudo.medico_validador_nome && resultado.data_validacao && (
                  <View style={styles.validadoBox}>
                    <Text style={styles.validadoTxt}>
                      Validado por{' '}
                      <Text style={{ fontWeight: '700' }}>
                        {estudo.medico_validador_nome}
                      </Text>
                      {' '}a {dataFormatadaLonga(resultado.data_validacao)}.{' '}
                      Esta informação não substitui uma consulta médica presencial.
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.semDados}>
                As observações do médico serão apresentadas após a validação do exame.
              </Text>
            )}
          </View>

          {/* Ações */}
          <View style={styles.acoes}>
            <TouchableOpacity
              style={[
                styles.btnPdf,
                !estudo.ficheiro_pdf && styles.btnPdfDesativado,
              ]}
              onPress={abrirPdf}
              disabled={!estudo.ficheiro_pdf}
              activeOpacity={0.8}
            >
              <Download size={18} color="#FFFFFF" />
              <Text style={styles.btnPdfTxt}>Descarregar relatório em PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnComparar}
              onPress={() =>
                Alert.alert('Em breve', 'A comparação de exames estará disponível numa próxima versão.')
              }
              activeOpacity={0.7}
            >
              <GitCompare size={16} color="#1A6FAF" />
              <Text style={styles.btnCompararTxt}>Comparar com outro exame</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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

  scroll: { paddingBottom: 40 },

  // Radiografia
  radiografiaWrap: { position: 'relative' },
  radiografia: {
    backgroundColor: '#1A1A2E',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiografiaTxt: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
  iaTag: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iaTxt: { fontSize: 11, fontWeight: '700', color: '#1A6FAF' },
  estadoTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  estadoTagTxt: { fontSize: 11, fontWeight: '700' },

  // Secções
  seccao: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  seccaoTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 14,
  },

  // Cobb
  cobbRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cobbLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  cobbValor: { fontSize: 44, fontWeight: '800', color: '#1A1A2E', lineHeight: 52 },
  cobbSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  corrigidoBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  corrigidoTxt: { fontSize: 11, color: '#1A6FAF', fontWeight: '600' },

  // Grid métricas
  metricasGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  metricaBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricaLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  metricaValor: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },

  // Info box severidade
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'flex-start',
  },
  infoTxt: { flex: 1, fontSize: 13, color: '#1A1A2E', lineHeight: 20 },

  // Notas do médico
  notasTxt: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 14,
  },
  validadoBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
  },
  validadoTxt: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },

  semDados: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  // Ações
  acoes: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  btnPdf: {
    backgroundColor: '#1A6FAF',
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    elevation: 2,
    shadowColor: '#1A6FAF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  btnPdfDesativado: { backgroundColor: '#9CA3AF' },
  btnPdfTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  btnComparar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    minHeight: 44,
  },
  btnCompararTxt: { color: '#1A6FAF', fontSize: 14, fontWeight: '600' },

  // Estados
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
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
});
