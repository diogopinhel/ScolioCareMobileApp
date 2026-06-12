import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Smile, Meh, Frown, AlertCircle, Info, Clock } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { addWellnessEntry, getWellnessLogDoPaciente } from '../../src/data/repository/wellness';
import { WellnessLogEntry } from '../../src/data/types';
import { i18n, useTranslation } from '../../src/i18n';
import { localeDeData } from '../../src/i18n/dateLocale';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dataHoje(): string {
  return new Date().toLocaleDateString(localeDeData(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function dataHojeISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function calcularContagem(): string {
  const agora = new Date();
  const meianoite = new Date(agora);
  meianoite.setDate(meianoite.getDate() + 1);
  meianoite.setHours(0, 0, 0, 0);
  const diff = Math.max(0, meianoite.getTime() - agora.getTime());
  const h = Math.floor(diff / 3600000);
  const min = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function corDor(nivel: number): string {
  if (nivel <= 3) return '#1D9E75';
  if (nivel <= 6) return '#F59E0B';
  return '#EF4444';
}

function labelDesconforto(valor: string | null): string {
  const map: Record<string, string> = {
    none: i18n.t('wellness.desconfortoNenhum'),
    mild: i18n.t('wellness.desconfortoLigeiro'),
    moderate: i18n.t('wellness.desconfortoModerado'),
    intense: i18n.t('wellness.desconfortoIntenso'),
  };
  return valor ? (map[valor] ?? valor) : '—';
}

function corDesconforto(valor: string | null): string {
  if (valor === 'none') return '#1D9E75';
  if (valor === 'intense') return '#EF4444';
  if (valor === 'mild' || valor === 'moderate') return '#F59E0B';
  return '#6B7280';
}

function dataFormatadaCurta(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(localeDeData(), { weekday: 'short', day: 'numeric', month: 'short' });
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type OpcaoDesconforto = 'none' | 'mild' | 'moderate' | 'intense';

function iconeDesconforto(valor: OpcaoDesconforto, sel: boolean) {
  const cor = sel
    ? valor === 'none'
      ? '#1D9E75'
      : valor === 'intense'
      ? '#EF4444'
      : '#F59E0B'
    : '#9CA3AF';
  if (valor === 'none') return <Smile size={24} color={cor} />;
  if (valor === 'mild') return <Meh size={24} color={cor} />;
  if (valor === 'moderate') return <Frown size={24} color={cor} />;
  return <AlertCircle size={24} color={cor} />;
}

// ─── Ecrã principal ───────────────────────────────────────────────────────────

export default function WellnessLogScreen() {
  const { utilizador } = useAuth();
  const { t } = useTranslation();

  const DESCONFORTO_OPCOES: { valor: OpcaoDesconforto; label: string }[] = [
    { valor: 'none', label: t('wellness.desconfortoNenhum') },
    { valor: 'mild', label: t('wellness.desconfortoLigeiro') },
    { valor: 'moderate', label: t('wellness.desconfortoModerado') },
    { valor: 'intense', label: t('wellness.desconfortoIntenso') },
  ];

  const [nivelDor, setNivelDor] = useState(5);
  const [desconforto, setDesconforto] = useState<OpcaoDesconforto>('none');
  const [notas, setNotas] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [entradaHoje, setEntradaHoje] = useState<WellnessLogEntry | null>(null);
  const [historicoEntradas, setHistoricoEntradas] = useState<WellnessLogEntry[]>([]);
  const [aCarregarDados, setACarregarDados] = useState(true);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  function toggleExpandido(dataRegisto: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      next.has(dataRegisto) ? next.delete(dataRegisto) : next.add(dataRegisto);
      return next;
    });
  }

  const [contagem, setContagem] = useState(calcularContagem);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const contaPendente = !!utilizador && !utilizador.conta_ativada;

  // Load today's entry on mount
  useEffect(() => {
    if (!utilizador || contaPendente) {
      setACarregarDados(false);
      return;
    }
    (async () => {
      try {
        const entradas = await getWellnessLogDoPaciente(utilizador.id);
        const hoje = dataHojeISO();
        const entrada = entradas.find((e) => e.data_registo === hoje) ?? null;
        setEntradaHoje(entrada);
        setHistoricoEntradas(entradas.filter((e) => e.data_registo !== hoje));
      } catch {
        // silently fail — form stays available
      } finally {
        setACarregarDados(false);
      }
    })();
  }, [utilizador?.id, contaPendente]);

  // Countdown interval — only active when locked
  useEffect(() => {
    if (!entradaHoje) {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current);
        intervaloRef.current = null;
      }
      return;
    }
    setContagem(calcularContagem());
    intervaloRef.current = setInterval(() => {
      const nova = calcularContagem();
      setContagem(nova);
      if (nova === '00:00:00') {
        setEntradaHoje(null);
        setHistoricoEntradas([]);
      }
    }, 1000);
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [entradaHoje]);

  async function guardarRegisto() {
    if (!utilizador) return;
    setErro(null);
    setAGuardar(true);
    try {
      const hoje = dataHojeISO();
      await addWellnessEntry({
        paciente_id: utilizador.id,
        data_registo: hoje,
        nivel_dor: nivelDor - 1, // display 1–10, store 0–9 in DB
        desconforto,
        notas: notas.trim() || null,
      });
      setEntradaHoje({
        id: '',
        paciente_id: utilizador.id,
        data_registo: hoje,
        nivel_dor: nivelDor - 1,
        desconforto,
        notas: notas.trim() || null,
        criado_em: new Date().toISOString(),
      });
    } catch {
      setErro(t('wellness.erroGuardar'));
    } finally {
      setAGuardar(false);
    }
  }

  const cor = corDor(nivelDor);

  // ─── Histórico (partilhado por ambos os estados de render) ────────────────

  function renderHistorico() {
    return (
      <>
        <View style={styles.histCabecalho}>
          <Text style={styles.histTitulo}>{t('wellness.historicoTitulo')}</Text>
          {historicoEntradas.length > 0 && (
            <Text style={styles.histContagem}>
              {t('wellness.historicoContagem', { contagem: historicoEntradas.length, rotulo: historicoEntradas.length === 1 ? t('wellness.registoSingular') : t('wellness.registoPlural') })}
            </Text>
          )}
        </View>

        {historicoEntradas.length === 0 ? (
          <View style={styles.histVazio}>
            <Clock size={28} color="#9CA3AF" />
            <Text style={styles.histVazioTxt}>{t('wellness.semRegistosAnteriores')}</Text>
          </View>
        ) : (
          historicoEntradas.map((entrada) => {
            const dor = entrada.nivel_dor + 1;
            const corDorItem = corDor(dor);
            const chave = entrada.id || entrada.data_registo;
            const temNotas = !!entrada.notas;
            const expandido = expandidos.has(entrada.data_registo);
            return (
              <View key={chave} style={styles.histItem}>
                {/* Linha principal */}
                <View style={styles.histLinhaTop}>
                  <View style={styles.histItemEsq}>
                    <Text style={styles.histData} numberOfLines={1}>
                      {dataFormatadaCurta(entrada.data_registo)}
                    </Text>
                  </View>
                  <View style={styles.histItemCentro}>
                    <View style={styles.histDorRow}>
                      <Text style={[styles.histDorNum, { color: corDorItem }]}>{dor}</Text>
                      <Text style={styles.histDorEscala}>/10</Text>
                    </View>
                    <View style={styles.histBarra}>
                      {Array.from({ length: 10 }, (_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.histBarraSeg,
                            i < dor && { backgroundColor: corDorItem },
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                  <View style={styles.histItemDir}>
                    <Text style={[styles.histDesconforto, { color: corDesconforto(entrada.desconforto) }]}>
                      {labelDesconforto(entrada.desconforto)}
                    </Text>
                  </View>
                </View>

                {/* Pill "Ver notas" — só se tiver notas */}
                {temNotas && (
                  <>
                    {expandido && (
                      <>
                        <View style={styles.histSeparador} />
                        <Text style={styles.histNotasExpandidas}>{entrada.notas}</Text>
                      </>
                    )}
                    <TouchableOpacity
                      style={styles.histPill}
                      onPress={() => toggleExpandido(entrada.data_registo)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.histPillTxt}>
                        {expandido ? t('wellness.ocultarNotas') : t('wellness.verNotas')}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            );
          })
        )}
      </>
    );
  }

  // ─── Pending ───────────────────────────────────────────────────────────────

  if (contaPendente) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.btnVoltar} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={24} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.titulo}>{t('wellness.titulo')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.pendente}>
          <View style={styles.pendenteIconWrap}>
            <Clock size={36} color="#1A6FAF" />
          </View>
          <Text style={styles.pendenteTitulo}>{t('wellness.contaPendenteTitulo')}</Text>
          <Text style={styles.pendenteDesc}>
            {t('wellness.contaPendenteDesc')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (aCarregarDados) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.btnVoltar} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={24} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.titulo}>{t('wellness.titulo')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator size="large" color="#1A6FAF" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  // ─── Locked (already registered today) ────────────────────────────────────

  if (entradaHoje) {
    const dorExibida = entradaHoje.nivel_dor + 1; // 0–9 in DB → 1–10 displayed
    const corEntrada = corDor(dorExibida);

    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.btnVoltar} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={24} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.titulo}>{t('wellness.titulo')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.dataHoje}>{dataHoje()}</Text>

          <View style={styles.seccao}>
            <View style={styles.registadoHeader}>
              <Text style={styles.seccaoTitulo}>{t('wellness.registoDeHoje')}</Text>
              <View style={styles.badgeRegistado}>
                <Text style={styles.badgeRegistadoTxt}>{t('wellness.registado')}</Text>
              </View>
            </View>

            <View style={styles.dorRow}>
              <View style={styles.dorValorWrap}>
                <Text style={[styles.dorNumero, { color: corEntrada }]}>{dorExibida}</Text>
                <Text style={styles.dorEscala}>/10</Text>
              </View>
            </View>
            <View style={styles.barraContainer}>
              {Array.from({ length: 10 }, (_, i) => (
                <View key={i} style={[styles.barraSeg, i < dorExibida && { backgroundColor: corEntrada }]} />
              ))}
            </View>
            <View style={styles.barraLabels}>
              <Text style={styles.barraLabelTxt}>{t('wellness.semDor')}</Text>
              <Text style={styles.barraLabelTxt}>{t('wellness.dorIntensa')}</Text>
            </View>

            <View style={styles.separador} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('wellness.desconforto')}</Text>
              <Text style={styles.infoValor}>{labelDesconforto(entradaHoje.desconforto)}</Text>
            </View>

            {entradaHoje.notas ? (
              <>
                <View style={styles.separador} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('wellness.notas')}</Text>
                  <Text style={[styles.infoValor, styles.notasLeitura]}>{entradaHoje.notas}</Text>
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.contagemBanner}>
            <Clock size={18} color="#1A6FAF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.contagemLabel}>{t('wellness.proximoRegisto')}</Text>
              <Text style={styles.contagemValor}>{contagem}</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.btnGuardar, styles.btnBloqueado]} disabled>
            <Text style={styles.btnGuardarTxt}>{t('wellness.jaRegistasteHoje')}</Text>
          </TouchableOpacity>

          {renderHistorico()}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Form (available) ──────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnVoltar} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Registar bem-estar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.dataHoje}>{dataHoje()}</Text>

        {/* Nível de dor */}
        <View style={styles.seccao}>
          <Text style={styles.seccaoTitulo}>{t('wellness.nivelDorTitulo')}</Text>
          <Text style={styles.seccaoSub}>{t('wellness.nivelDorSub')}</Text>

          <View style={styles.dorRow}>
            <TouchableOpacity style={styles.dorBtn} onPress={() => setNivelDor((v) => Math.max(1, v - 1))}>
              <Text style={styles.dorBtnTxt}>−</Text>
            </TouchableOpacity>
            <View style={styles.dorValorWrap}>
              <Text style={[styles.dorNumero, { color: cor }]}>{nivelDor}</Text>
              <Text style={styles.dorEscala}>/10</Text>
            </View>
            <TouchableOpacity style={styles.dorBtn} onPress={() => setNivelDor((v) => Math.min(10, v + 1))}>
              <Text style={styles.dorBtnTxt}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.barraContainer}>
            {Array.from({ length: 10 }, (_, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.barraSeg, i < nivelDor && { backgroundColor: cor }]}
                onPress={() => setNivelDor(i + 1)}
              />
            ))}
          </View>
          <View style={styles.barraLabels}>
            <Text style={styles.barraLabelTxt}>{t('wellness.semDor')}</Text>
            <Text style={styles.barraLabelTxt}>{t('wellness.dorIntensa')}</Text>
          </View>
        </View>

        {/* Desconforto */}
        <View style={styles.seccao}>
          <Text style={styles.seccaoTitulo}>{t('wellness.desconfortoTitulo')}</Text>
          <Text style={styles.seccaoSub}>{t('wellness.desconfortoSub')}</Text>
          <View style={styles.grid}>
            {DESCONFORTO_OPCOES.map((opcao) => {
              const sel = desconforto === opcao.valor;
              return (
                <TouchableOpacity
                  key={opcao.valor}
                  style={[styles.gridItem, sel && styles.gridItemSel]}
                  onPress={() => setDesconforto(opcao.valor)}
                  activeOpacity={0.7}
                >
                  {iconeDesconforto(opcao.valor, sel)}
                  <Text style={[styles.gridLabel, sel && styles.gridLabelSel]}>{opcao.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notas */}
        <View style={styles.seccao}>
          <Text style={styles.seccaoTitulo}>{t('wellness.notasTitulo')}</Text>
          <Text style={styles.seccaoSub}>{t('wellness.notasSub')}</Text>
          <TextInput
            style={styles.notasInput}
            value={notas}
            onChangeText={setNotas}
            placeholder={t('wellness.notasPlaceholder')}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          {notas.length > 400 && (
            <Text style={styles.notasContador}>{notas.length}/500</Text>
          )}
        </View>

        <View style={styles.aviso}>
          <Info size={16} color="#1A6FAF" />
          <Text style={styles.avisoTxt}>
            {t('wellness.aviso')}
          </Text>
        </View>

        {erro && (
          <View style={styles.erroBox}>
            <Text style={styles.erroTxt}>{erro}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btnGuardar, aGuardar && styles.btnGuardarDisabled]}
          onPress={guardarRegisto}
          disabled={aGuardar}
          activeOpacity={0.8}
        >
          {aGuardar ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnGuardarTxt}>{t('wellness.guardarRegisto')}</Text>
          )}
        </TouchableOpacity>

        {renderHistorico()}
      </ScrollView>
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
  btnVoltar: { width: 40, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  titulo: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },

  scroll: { padding: 16, paddingBottom: 40 },
  dataHoje: { fontSize: 13, color: '#6B7280', marginBottom: 16, textTransform: 'capitalize' },

  seccao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  seccaoTitulo: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  seccaoSub: { fontSize: 13, color: '#6B7280', marginBottom: 16 },

  registadoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  badgeRegistado: {
    backgroundColor: '#1D9E75',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeRegistadoTxt: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  dorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginBottom: 20,
  },
  dorBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dorBtnTxt: { fontSize: 26, color: '#1A1A2E', lineHeight: 30, fontWeight: '400' },
  dorValorWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  dorNumero: { fontSize: 60, fontWeight: '800', lineHeight: 68 },
  dorEscala: { fontSize: 20, color: '#9CA3AF' },

  barraContainer: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  barraSeg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  barraLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  barraLabelTxt: { fontSize: 11, color: '#9CA3AF' },

  separador: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },

  infoRow: { gap: 4 },
  infoLabel: { fontSize: 11, color: '#6B7280' },
  infoValor: { fontSize: 15, color: '#1A1A2E', fontWeight: '500' },
  notasLeitura: { fontSize: 14, fontWeight: '400', lineHeight: 20 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: {
    width: '47%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gridItemSel: { backgroundColor: '#EFF6FF', borderColor: '#1A6FAF' },
  gridLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  gridLabelSel: { color: '#1A1A2E', fontWeight: '700' },

  notasInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: '#1A1A2E',
    minHeight: 100,
  },
  notasContador: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },

  contagemBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  contagemLabel: { fontSize: 13, color: '#1A6FAF' },
  contagemValor: { fontSize: 22, fontWeight: '800', color: '#1A6FAF', marginTop: 2 },

  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  avisoTxt: { flex: 1, fontSize: 12, color: '#1A6FAF', lineHeight: 18 },

  erroBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  erroTxt: { color: '#EF4444', fontSize: 13, textAlign: 'center' },

  btnGuardar: {
    backgroundColor: '#1A6FAF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  btnGuardarDisabled: { opacity: 0.6 },
  btnBloqueado: { backgroundColor: '#9CA3AF', opacity: 0.7 },
  btnGuardarTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // ── Histórico ────────────────────────────────────────────────────────────
  histCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  },
  histTitulo: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  histContagem: { fontSize: 13, color: '#1A6FAF', fontWeight: '500' },

  histVazio: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  histVazioTxt: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },

  histItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  histItemEsq: { width: 68 },
  histData: { fontSize: 12, fontWeight: '600', color: '#1A1A2E', textTransform: 'capitalize' },

  histItemCentro: { flex: 1 },
  histDorRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 4 },
  histDorNum: { fontSize: 18, fontWeight: '800' },
  histDorEscala: { fontSize: 11, color: '#9CA3AF' },
  histBarra: { flexDirection: 'row', gap: 2 },
  histBarraSeg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#E5E7EB' },

  histItemDir: { width: 72, alignItems: 'flex-end' },
  histDesconforto: { fontSize: 12, fontWeight: '600' },

  histLinhaTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  histSeparador: { height: 1, backgroundColor: '#F3F4F6', marginTop: 10, marginBottom: 8 },
  histNotasExpandidas: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  histPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  histPillTxt: { fontSize: 12, color: '#1A6FAF', fontWeight: '600' },

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
