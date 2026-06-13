import React, { createContext, useContext, useEffect, useState } from 'react';
import { Paciente } from '../data/types';
import * as authRepo from '../data/repository/auth';
import { i18n } from '../i18n';

function aplicarIdioma(paciente: { idioma?: string | null } | null): void {
  const idioma = paciente?.idioma === 'en' ? 'en' : 'pt-PT';
  if (i18n.language !== idioma) {
    void i18n.changeLanguage(idioma);
  }
}

interface AuthContextValue {
  utilizador: Paciente | null;
  estaAutenticado: boolean;
  aCarregar: boolean;
  pendente2FA: string | null;
  login: (email: string, password: string) => Promise<{ needsTwoFactor: boolean }>;
  logout: () => Promise<void>;
  verificar2FA: (email: string, token: string) => Promise<void>;
  verificarEAtivar2FA: (email: string, token: string) => Promise<void>;
  enviarOtp2FA: (email: string) => Promise<void>;
  desativar2FA: () => Promise<void>;
  completarVerificacaoEmail: () => Promise<void>;
  refreshUtilizador: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [utilizador, setUtilizador] = useState<Paciente | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  const [pendente2FA, setPendente2FA] = useState<string | null>(null);

  useEffect(() => {
    const { data: subscription } = authRepo.subscribeToMudancasAuth((paciente) => {
      setUtilizador(paciente);
      aplicarIdioma(paciente);
      setACarregar(false);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  // estaAutenticado is false while 2FA verification is pending
  const estaAutenticado = !!utilizador && pendente2FA === null;

  async function login(email: string, password: string): Promise<{ needsTwoFactor: boolean }> {
    const resultado = await authRepo.login(email, password);
    if ('needsTwoFactor' in resultado) {
      setPendente2FA(email);
      return { needsTwoFactor: true };
    }
    setUtilizador(resultado.paciente);
    aplicarIdioma(resultado.paciente);
    return { needsTwoFactor: false };
  }

  async function verificar2FA(email: string, token: string): Promise<void> {
    const paciente = await authRepo.verificarOtpEmail(email, token);
    setPendente2FA(null);
    setUtilizador(paciente);
    aplicarIdioma(paciente);
  }

  async function verificarEAtivar2FA(email: string, token: string): Promise<void> {
    await authRepo.verificarOtpEmail(email, token);
    if (!utilizador) throw new Error('Utilizador não autenticado.');
    await authRepo.ativar2FA(utilizador.id);
    setUtilizador({ ...utilizador, two_factor_ativo: true });
  }

  async function enviarOtp2FA(email: string): Promise<void> {
    await authRepo.enviarOtpEmail(email);
  }

  async function desativar2FA(): Promise<void> {
    if (!utilizador) throw new Error('Utilizador não autenticado.');
    await authRepo.desativar2FA(utilizador.id);
    setUtilizador({ ...utilizador, two_factor_ativo: false });
  }

  async function logout(): Promise<void> {
    await authRepo.logout();
    setUtilizador(null);
    setPendente2FA(null);
    void i18n.changeLanguage('pt-PT');
  }

  async function completarVerificacaoEmail(): Promise<void> {
    const paciente = await authRepo.obterPacienteAtual();
    if (!paciente) return;

    try {
      await authRepo.aplicarPerfilPendente(paciente.id);
    } catch {
      // Falha silenciosa — o utilizador entra na app mas o perfil pode estar incompleto
    }

    const pacienteAtualizado = await authRepo.obterPacienteAtual();
    const p = pacienteAtualizado ?? paciente;
    setUtilizador(p);
    aplicarIdioma(p);
  }

  async function refreshUtilizador(): Promise<void> {
    const paciente = await authRepo.obterPacienteAtual();
    if (paciente) {
      setUtilizador(paciente);
      aplicarIdioma(paciente);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        utilizador,
        estaAutenticado,
        aCarregar,
        pendente2FA,
        login,
        logout,
        verificar2FA,
        verificarEAtivar2FA,
        enviarOtp2FA,
        desativar2FA,
        completarVerificacaoEmail,
        refreshUtilizador,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
