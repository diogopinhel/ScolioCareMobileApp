import React, { createContext, useContext, useEffect, useState } from 'react';
import { Paciente } from '../data/types';
import * as authRepo from '../data/repository/auth';

interface AuthContextValue {
  utilizador: Paciente | null;
  estaAutenticado: boolean;
  aCarregar: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [utilizador, setUtilizador] = useState<Paciente | null>(null);
  const [aCarregar, setACarregar] = useState(true);

  useEffect(() => {
    const { data: subscription } = authRepo.subscribeToMudancasAuth((paciente) => {
      setUtilizador(paciente);
      setACarregar(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function login(email: string, password: string) {
    const paciente = await authRepo.login(email, password);
    setUtilizador(paciente);
  }

  async function logout() {
    await authRepo.logout();
    setUtilizador(null);
  }

  return (
    <AuthContext.Provider
      value={{
        utilizador,
        estaAutenticado: !!utilizador,
        aCarregar,
        login,
        logout,
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
