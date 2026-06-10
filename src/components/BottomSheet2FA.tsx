import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Shield, ShieldCheck } from 'lucide-react-native';

export interface BottomSheet2FAProps {
  visivel: boolean;
  onAtivar: () => Promise<void>;
  onMaisLarde: () => void;
}

export default function BottomSheet2FA({ visivel, onAtivar, onMaisLarde }: BottomSheet2FAProps) {
  const insets = useSafeAreaInsets();
  const transY = useRef(new Animated.Value(500)).current;
  const [aAtivar, setAAtivar] = useState(false);

  useEffect(() => {
    if (visivel) {
      transY.setValue(500);
      Animated.spring(transY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
      }).start();
    }
  }, [visivel, transY]);

  async function handleAtivar() {
    if (aAtivar) return;
    setAAtivar(true);
    try {
      await onAtivar();
    } finally {
      setAAtivar(false);
    }
  }

  if (!visivel) return null;

  return (
    <Modal transparent animationType="none" visible={visivel} statusBarTranslucent>
      <View style={estilos.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onMaisLarde} />

        <Animated.View
          style={[
            estilos.painel,
            { paddingBottom: Math.max(insets.bottom, 20), transform: [{ translateY: transY }] },
          ]}
        >
          <View style={estilos.handle} />

          <View style={estilos.cabecalho}>
            <View style={estilos.cabecalhoRow}>
              <View style={estilos.iconTile}>
                <Shield size={22} color="#1A6FAF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilos.titulo}>Protege a tua conta agora</Text>
                <Text style={estilos.subtitulo}>Autenticação de dois fatores</Text>
              </View>
            </View>
            <Text style={estilos.descricao}>
              Um código por email em cada acesso — configura em segundos.
            </Text>
          </View>

          <View style={estilos.corpo}>
            <View style={estilos.beneficios}>
              {[
                'Impede acessos não autorizados',
                'Alerta se alguém tentar entrar',
                'Podes desativar em qualquer altura',
              ].map((item) => (
                <View key={item} style={estilos.beneficioRow}>
                  <View style={estilos.checkCircle}>
                    <Check size={11} color="#FFFFFF" />
                  </View>
                  <Text style={estilos.beneficioTxt}>{item}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[estilos.btnAtivo, aAtivar && estilos.btnDisabled]}
              onPress={handleAtivar}
              disabled={aAtivar}
              activeOpacity={0.85}
            >
              {aAtivar ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <ShieldCheck size={18} color="#FFFFFF" />
                  <Text style={estilos.btnAtivoTxt}>Ativar agora</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={estilos.btnGhost} onPress={onMaisLarde} activeOpacity={0.7}>
              <Text style={estilos.btnGhostTxt}>Mais tarde</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(15,20,40,0.35)',
    justifyContent: 'flex-end',
  },
  painel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  cabecalho: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cabecalhoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontSize: 14, fontWeight: '500', color: '#1A1A2E', marginBottom: 2 },
  subtitulo: { fontSize: 11, color: '#6B7280' },
  descricao: { fontSize: 11, color: '#6B7280', lineHeight: 16 },
  corpo: { paddingHorizontal: 20, paddingTop: 20 },
  beneficios: { gap: 12, marginBottom: 24 },
  beneficioRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1D9E75',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  beneficioTxt: { fontSize: 13, color: '#1A1A2E', flex: 1 },
  btnAtivo: {
    backgroundColor: '#1A6FAF',
    borderRadius: 11,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  btnAtivoTxt: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  btnGhost: {
    borderRadius: 11,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostTxt: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
});
