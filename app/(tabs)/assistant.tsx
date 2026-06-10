import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  Platform,
  KeyboardAvoidingView,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, AlertTriangle, Info, Send } from 'lucide-react-native';
import { encontrarResposta } from '../../src/utils/faqMatcher';

// ─── Types ───────────────────────────────────────────────────────────────────

type TipoMensagem = 'utilizador' | 'assistente' | 'ajuda';

type Mensagem = {
  id: string;
  tipo: TipoMensagem;
  texto: string;
  fonte: string;
  timestamp: number;
  temCta?: boolean;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const CHIPS_FAQ = [
  'O que é a escoliose?',
  'O que é o ângulo de Cobb?',
  'Graus de severidade',
  'Quando é necessária cirurgia?',
  'Posso fazer exercício?',
  'A escoliose piora com o tempo?',
];

const ATRASO_RESPOSTA_MS = 700;

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function IndicadorEscrita({ dots }: { dots: Animated.Value[] }) {
  return (
    <View style={styles.msgRowAssistente}>
      <View style={[styles.bolhaAssistente, styles.bolhaDigitando]}>
        <View style={styles.dotRow}>
          {dots.map((dot, i) => (
            <Animated.View
              key={i}
              style={[styles.dot, { transform: [{ translateY: dot }] }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Ecrã principal ──────────────────────────────────────────────────────────

export default function AssistantScreen() {
  const [conversa, setConversa] = useState<Mensagem[]>([]);
  const [textoPendente, setTextoPendente] = useState('');
  const [aProcessar, setAProcessar] = useState(false);

  const animDots = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const animRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!aProcessar) {
      animRef.current?.stop();
      animRef.current = null;
      animDots.forEach((d) => d.setValue(0));
      return;
    }
    const animations = animDots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: -6, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay((2 - i) * 200 + 360),
        ])
      )
    );
    const anim = Animated.parallel(animations);
    animRef.current = anim;
    anim.start();
    return () => anim.stop();
  }, [aProcessar]);

  function gerarId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const enviarMensagem = useCallback(
    (texto: string) => {
      const input = texto.trim();
      if (!input || aProcessar) return;

      const msgUtilizador: Mensagem = {
        id: gerarId(),
        tipo: 'utilizador',
        texto: input,
        fonte: '',
        timestamp: Date.now(),
      };

      setConversa((prev) => [msgUtilizador, ...prev]);
      setTextoPendente('');
      setAProcessar(true);

      setTimeout(() => {
        const resultado = encontrarResposta(input);
        const msgAssistente: Mensagem = {
          id: gerarId(),
          tipo: 'assistente',
          texto: resultado.resposta,
          fonte: resultado.fonte,
          timestamp: Date.now(),
          temCta: resultado.foraAmbito,
        };
        setConversa((prev) => [msgAssistente, ...prev]);
        setAProcessar(false);
      }, ATRASO_RESPOSTA_MS);
    },
    [aProcessar]
  );

  function abrirAjuda() {
    if (aProcessar) return;
    const msgAjuda: Mensagem = {
      id: gerarId(),
      tipo: 'ajuda',
      texto: 'Claro! Aqui ficam alguns temas sobre os quais posso ajudar:',
      fonte: 'Assistente ScolioCare',
      timestamp: Date.now(),
    };
    setConversa((prev) => [msgAjuda, ...prev]);
  }

  function formatarHora(ts: number): string {
    return new Date(ts).toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function renderMensagem({ item }: ListRenderItemInfo<Mensagem>) {
    if (item.tipo === 'utilizador') {
      return (
        <View style={styles.msgRowUser}>
          <View style={styles.bolhaUser}>
            <Text style={styles.bolhaUserTxt}>{item.texto}</Text>
          </View>
          <Text style={styles.msgTime}>{formatarHora(item.timestamp)}</Text>
        </View>
      );
    }

    if (item.tipo === 'ajuda') {
      return (
        <View style={styles.msgRowAssistente}>
          <View style={[styles.bolhaAssistente, styles.bolhaAjuda]}>
            <Text style={styles.bolhaAssistenteTxt}>{item.texto}</Text>
            <View style={styles.chipsInlineWrap}>
              {CHIPS_FAQ.map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={styles.chipInline}
                  onPress={() => enviarMensagem(chip)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipInlineTxt}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={styles.msgSource}>Toque numa sugestão para a enviar</Text>
          <View style={styles.msgDisclaimerRow}>
            <Info size={11} color="#6B7280" />
            <Text style={styles.msgDisclaimerTxt}>
              Informação educativa. Consulte o seu médico.
            </Text>
          </View>
        </View>
      );
    }

    // tipo === 'assistente'
    return (
      <View style={styles.msgRowAssistente}>
        <View style={styles.bolhaAssistente}>
          <Text style={styles.bolhaAssistenteTxt}>
            {item.texto}
            {item.temCta && (
              <Text>
                {' '}Caso queira ver os temas disponíveis,{' '}
                <Text style={styles.ctaLink} onPress={abrirAjuda}>
                  clique aqui
                </Text>
                .
              </Text>
            )}
          </Text>
        </View>
        <Text style={styles.msgSource}>Fonte: {item.fonte}</Text>
        <View style={styles.msgDisclaimerRow}>
          <Info size={11} color="#6B7280" />
          <Text style={styles.msgDisclaimerTxt}>
            Informação educativa. Consulte o seu médico.
          </Text>
        </View>
      </View>
    );
  }

  const envioBloqueado = textoPendente.trim() === '' || aProcessar;
  const mostrarEstadoVazio = conversa.length === 0 && !aProcessar;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <MessageCircle size={22} color="#1A6FAF" strokeWidth={1.75} />
          <Text style={styles.headerTitle}>Assistente</Text>
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={abrirAjuda}
            activeOpacity={0.7}
          >
            <Text style={styles.helpBtnTxt}>?</Text>
          </TouchableOpacity>
        </View>

        {/* ── Banner de aviso (sempre visível, fora do scroll) ── */}
        <View style={styles.disclaimer}>
          <AlertTriangle size={16} color="#B45309" strokeWidth={2} style={styles.disclaimerIcon} />
          <Text style={styles.disclaimerTxt}>
            Este assistente fornece informação educativa sobre escoliose. Não substitui aconselhamento médico.
          </Text>
        </View>

        {/* ── Corpo ── */}
        {mostrarEstadoVazio ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <MessageCircle size={36} color="#1A6FAF" strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>Como posso ajudar?</Text>
            <Text style={styles.emptySubtitle}>
              Faça uma pergunta ou escolha um tema abaixo.
            </Text>
            <View style={styles.chipsGrid}>
              {CHIPS_FAQ.map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={styles.chip}
                  onPress={() => enviarMensagem(chip)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipTxt}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            style={styles.chatList}
            data={conversa}
            keyExtractor={(item) => item.id}
            renderItem={renderMensagem}
            inverted
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              aProcessar ? <IndicadorEscrita dots={animDots} /> : null
            }
          />
        )}

        {/* ── Barra de input ── */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Escreva a sua pergunta..."
            placeholderTextColor="#6B7280"
            value={textoPendente}
            onChangeText={setTextoPendente}
            onSubmitEditing={() => enviarMensagem(textoPendente)}
            returnKeyType="send"
            editable={!aProcessar}
            multiline={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, envioBloqueado && styles.sendBtnDisabled]}
            onPress={() => enviarMensagem(textoPendente)}
            disabled={envioBloqueado}
            activeOpacity={0.8}
          >
            <Send
              size={18}
              color={envioBloqueado ? '#6B7280' : '#FFFFFF'}
              strokeWidth={2.2}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header
  header: {
    height: 52,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  helpBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBtnTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A6FAF',
  },

  // Disclaimer banner
  disclaimer: {
    margin: 12,
    marginBottom: 0,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  disclaimerIcon: { marginTop: 1 },
  disclaimerTxt: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    backgroundColor: '#EFF6FF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    maxWidth: 240,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    maxWidth: 320,
  },
  chip: {
    width: '47%',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#1A6FAF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTxt: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A6FAF',
    textAlign: 'center',
    lineHeight: 17,
  },

  // Chat list
  chatList: { flex: 1 },
  chatContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
    flexGrow: 1,
  },

  // Message rows
  msgRowUser: {
    alignItems: 'flex-end',
    marginTop: 14,
  },
  msgRowAssistente: {
    alignItems: 'flex-start',
    marginTop: 14,
  },

  // Bubbles — cauda: borderBottomRightRadius 4 (user), borderBottomLeftRadius 4 (assistant)
  bolhaUser: {
    maxWidth: '78%',
    backgroundColor: '#1A6FAF',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bolhaUserTxt: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 21,
  },
  bolhaAssistente: {
    maxWidth: '78%',
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bolhaAjuda: { maxWidth: '88%' },
  bolhaDigitando: { paddingVertical: 14 },
  bolhaAssistenteTxt: {
    fontSize: 14,
    color: '#1A1A2E',
    lineHeight: 21,
  },

  // Message metadata
  msgTime: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  msgSource: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#6B7280',
    marginTop: 5,
  },
  msgDisclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  msgDisclaimerTxt: {
    fontSize: 11,
    color: '#6B7280',
  },

  // Inline chips (inside help bubble)
  chipsInlineWrap: {
    marginTop: 10,
    gap: 7,
  },
  chipInline: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#1A6FAF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipInlineTxt: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A6FAF',
    lineHeight: 17,
  },

  // Typing dots
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    backgroundColor: '#9CA3AF',
    borderRadius: 3.5,
  },

  // Input bar
  inputBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 64,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A2E',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A6FAF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: 'transparent',
  },
  ctaLink: {
    color: '#1A6FAF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
