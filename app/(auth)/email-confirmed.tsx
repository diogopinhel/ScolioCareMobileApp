import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useTranslation } from '../../src/i18n';

export default function EmailConfirmedScreen() {
  const { completarVerificacaoEmail } = useAuth();
  const { t } = useTranslation();
  const [aNavegar, setANavegar] = useState(false);

  async function irParaApp() {
    if (aNavegar) return;
    setANavegar(true);
    try {
      await completarVerificacaoEmail();
      router.replace('/(tabs)/home' as never);
    } catch {
      router.replace('/(auth)/login' as never);
    }
  }

  return (
    <SafeAreaView style={estilos.safe} edges={['top']}>
      <View style={estilos.header}>
        <Text style={estilos.headerTitulo}>{t('auth.emailConfirmed.headerTitulo')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={estilos.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Indicador de progresso — todos concluídos */}
        <View style={estilos.progresso}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[estilos.progPonto, estilos.progPontoConcluido]} />
          ))}
        </View>

        <View style={estilos.iconCircle}>
          <Check size={38} color="#1D9E75" />
        </View>

        <Text style={estilos.titulo}>{t('auth.emailConfirmed.titulo')}</Text>

        <Text style={estilos.subtitulo}>
          {t('auth.emailConfirmed.subtitulo')}
        </Text>

        <TouchableOpacity
          style={[estilos.btnPrimario, aNavegar && estilos.btnDisabled]}
          onPress={irParaApp}
          disabled={aNavegar}
          activeOpacity={0.85}
        >
          {aNavegar ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={estilos.btnPrimarioTxt}>{t('auth.emailConfirmed.entrarNaConta')}</Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    backgroundColor: '#1A6FAF',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitulo: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },

  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
  },

  progresso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 40,
  },
  progPonto: { width: 10, height: 10, borderRadius: 5 },
  progPontoConcluido: { backgroundColor: '#1D9E75' },

  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ECFDF5',
    borderWidth: 3,
    borderColor: '#1D9E75',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  titulo: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitulo: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
    marginBottom: 28,
  },

  btnPrimario: {
    backgroundColor: '#1A6FAF',
    borderRadius: 11,
    height: 46,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimarioTxt: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
});
