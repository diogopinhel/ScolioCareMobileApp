import { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, AlertTriangle } from 'lucide-react-native';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SeccaoLegal {
  titulo: string;
  /** Parágrafos antes dos bullets, separados por "\n\n". */
  corpo?: string;
  /** Lista de pontos (opcional). */
  bullets?: string[];
  /** Parágrafos depois dos bullets, separados por "\n\n". */
  corpoFim?: string;
  /** Realça a secção numa caixa azul-clara (ex.: consentimento). */
  destaque?: boolean;
}

interface DocumentoLegalProps {
  titulo: string;
  /** Ícone do bloco introdutório (chip azul-claro). */
  icone: ReactNode;
  ultimaAtualizacao: string;
  intro: string;
  /** Callout âmbar de aviso (ex.: aviso médico nos Termos). */
  aviso?: string;
  seccoes: SeccaoLegal[];
  rodape: string;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Paragrafos({ texto, cor }: { texto: string; cor: string }) {
  return (
    <>
      {texto.split('\n\n').map((paragrafo, i) => (
        <Text key={i} style={[styles.corpo, { color: cor }]}>
          {paragrafo}
        </Text>
      ))}
    </>
  );
}

function Bullets({ itens }: { itens: string[] }) {
  return (
    <View style={styles.bulletsWrap}>
      {itens.map((item, i) => (
        <View key={i} style={styles.bulletLinha}>
          <Text style={styles.bulletPonto}>•</Text>
          <Text style={styles.bulletTxt}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DocumentoLegal({
  titulo,
  icone,
  ultimaAtualizacao,
  intro,
  aviso,
  seccoes,
  rodape,
}: DocumentoLegalProps) {
  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile' as never);
  }

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
          {titulo}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Bloco introdutório */}
        <View style={styles.introCard}>
          <View style={styles.introTopo}>
            <View style={styles.chipIcone}>{icone}</View>
            <Text style={styles.ultimaAtualizacao}>{ultimaAtualizacao}</Text>
          </View>
          <Text style={styles.introTxt}>{intro}</Text>
        </View>

        {/* Callout de aviso (âmbar) */}
        {aviso && (
          <View style={styles.avisoBox}>
            <AlertTriangle size={18} color="#F59E0B" />
            <Text style={styles.avisoTxt}>{aviso}</Text>
          </View>
        )}

        {/* Secções */}
        {seccoes.map((seccao, i) => (
          <View key={i}>
            <Text style={styles.seccaoTitulo}>{seccao.titulo.toUpperCase()}</Text>
            <View style={[styles.card, seccao.destaque && styles.cardDestaque]}>
              {seccao.corpo && (
                <Paragrafos
                  texto={seccao.corpo}
                  cor={seccao.destaque ? '#1A1A2E' : '#6B7280'}
                />
              )}
              {seccao.bullets && seccao.bullets.length > 0 && (
                <Bullets itens={seccao.bullets} />
              )}
              {seccao.corpoFim && (
                <Paragrafos
                  texto={seccao.corpoFim}
                  cor={seccao.destaque ? '#1A1A2E' : '#6B7280'}
                />
              )}
            </View>
          </View>
        ))}

        {/* Rodapé */}
        <Text style={styles.rodape}>{rodape}</Text>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  btnVoltar: { width: 40, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitulo: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
  },

  scroll: { paddingTop: 16, paddingBottom: 40 },

  // Bloco introdutório
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    gap: 12,
  },
  introTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chipIcone: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ultimaAtualizacao: { flex: 1, fontSize: 12, color: '#6B7280' },
  introTxt: { fontSize: 14, color: '#6B7280', lineHeight: 21 },

  // Callout âmbar
  avisoBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  avisoTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1A1A2E', lineHeight: 19 },

  // Secções
  seccaoTitulo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    gap: 10,
  },
  cardDestaque: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  corpo: { fontSize: 14, lineHeight: 21 },

  // Bullets
  bulletsWrap: { gap: 8 },
  bulletLinha: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bulletPonto: { fontSize: 14, color: '#1A6FAF', lineHeight: 21 },
  bulletTxt: { flex: 1, fontSize: 14, color: '#6B7280', lineHeight: 21 },

  // Rodapé
  rodape: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 4,
    lineHeight: 18,
  },
});
