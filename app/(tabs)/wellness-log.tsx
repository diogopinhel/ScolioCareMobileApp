import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Smile, Meh, Frown, AlertCircle, Info, Clock } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { addWellnessEntry } from '../../src/data/repository/wellness';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dataHoje(): string {
  return new Date().toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function dataHojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function corDor(nivel: number): string {
  if (nivel <= 3) return '#1D9E75';
  if (nivel <= 6) return '#F59E0B';
  return '#EF4444';
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type OpcaoDesconforto = 'none' | 'mild' | 'moderate' | 'intense';

const DESCONFORTO_OPCOES: { valor: OpcaoDesconforto; label: string }[] = [
  { valor: 'none', label: 'Nenhum' },
  { valor: 'mild', label: 'Ligeiro' },
  { valor: 'moderate', label: 'Moderado' },
  { valor: 'intense', label: 'Intenso' },
];

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
  const [nivelDor, setNivelDor] = useState(5);
  const [desconforto, setDesconforto] = useState<OpcaoDesconforto>('none');
  const [notas, setNotas] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  const contaPendente = !!utilizador && !utilizador.conta_ativada;

  if (contaPendente) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.btnVoltar}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={24} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.titulo}>Registar bem-estar</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.pendente}>
          <View style={styles.pendenteIconWrap}>
            <Clock size={36} color="#1A6FAF" />
          </View>
          <Text style={styles.pendenteTitulo}>Conta pendente de verificação</Text>
          <Text style={styles.pendenteDesc}>
            O registo de bem-estar ficará disponível assim que a sua conta for ativada e um
            médico responsável for atribuído.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  async function guardarRegisto() {
    if (!utilizador) return;
    setAGuardar(true);
    try {
      await addWellnessEntry({
        paciente_id: utilizador.id,
        data_registo: dataHojeISO(),
        nivel_dor: nivelDor - 1, // display 1–10, store 0–9 in DB
        desconforto,
        notas: notas.trim() || null,
      });
      Alert.alert(
        'Registo guardado',
        'O seu registo de bem-estar foi guardado com sucesso.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível guardar o registo. Tente novamente.');
    } finally {
      setAGuardar(false);
    }
  }

  const cor = corDor(nivelDor);

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
        <Text style={styles.titulo}>Registar bem-estar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Date */}
        <Text style={styles.dataHoje}>{dataHoje()}</Text>

        {/* Nível de dor */}
        <View style={styles.seccao}>
          <Text style={styles.seccaoTitulo}>Nível de dor</Text>
          <Text style={styles.seccaoSub}>Selecione o seu nível de dor hoje</Text>

          <View style={styles.dorRow}>
            <TouchableOpacity
              style={styles.dorBtn}
              onPress={() => setNivelDor((v) => Math.max(1, v - 1))}
            >
              <Text style={styles.dorBtnTxt}>−</Text>
            </TouchableOpacity>
            <View style={styles.dorValorWrap}>
              <Text style={[styles.dorNumero, { color: cor }]}>{nivelDor}</Text>
              <Text style={styles.dorEscala}>/10</Text>
            </View>
            <TouchableOpacity
              style={styles.dorBtn}
              onPress={() => setNivelDor((v) => Math.min(10, v + 1))}
            >
              <Text style={styles.dorBtnTxt}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Segmented bar */}
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
            <Text style={styles.barraLabelTxt}>Sem dor</Text>
            <Text style={styles.barraLabelTxt}>Dor intensa</Text>
          </View>
        </View>

        {/* Desconforto */}
        <View style={styles.seccao}>
          <Text style={styles.seccaoTitulo}>Desconforto</Text>
          <Text style={styles.seccaoSub}>Como descreve o seu desconforto geral?</Text>
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
                  <Text style={[styles.gridLabel, sel && styles.gridLabelSel]}>
                    {opcao.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notas adicionais */}
        <View style={styles.seccao}>
          <Text style={styles.seccaoTitulo}>Notas adicionais</Text>
          <Text style={styles.seccaoSub}>Opcional — partilhe mais detalhes sobre como se sente</Text>
          <TextInput
            style={styles.notasInput}
            value={notas}
            onChangeText={setNotas}
            placeholder="Escreva aqui as suas notas..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Aviso de privacidade */}
        <View style={styles.aviso}>
          <Info size={16} color="#1A6FAF" />
          <Text style={styles.avisoTxt}>
            Os seus dados de bem-estar são privados e só podem ser partilhados com o seu médico responsável com o seu consentimento expresso.
          </Text>
        </View>

        {/* Botão guardar */}
        <TouchableOpacity
          style={[styles.btnGuardar, aGuardar && styles.btnGuardarDisabled]}
          onPress={guardarRegisto}
          disabled={aGuardar}
          activeOpacity={0.8}
        >
          {aGuardar ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnGuardarTxt}>Guardar registo</Text>
          )}
        </TouchableOpacity>
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
  btnVoltar: {
    width: 40,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titulo: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },

  scroll: { padding: 16, paddingBottom: 40 },
  dataHoje: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    textTransform: 'capitalize',
  },

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

  // Nível de dor
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

  // Desconforto grid
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

  // Notas
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

  // Aviso
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

  // Botão guardar
  btnGuardar: {
    backgroundColor: '#1A6FAF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  btnGuardarDisabled: { opacity: 0.6 },
  btnGuardarTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

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
