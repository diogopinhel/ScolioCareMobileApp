import { supabase } from '../../lib/supabase';
import { Paciente } from '../types';

export async function login(email: string, password: string): Promise<Paciente> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Utilizador não encontrado.');

  const { data: utilizador, error: profileError } = await supabase
    .from('utilizadores')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError) throw profileError;
  if (!utilizador) throw new Error('Perfil de utilizador não encontrado.');

  if (utilizador.perfil !== 'PACIENTE') {
    await supabase.auth.signOut();
    throw new Error('Acesso restrito. Esta aplicação é apenas para pacientes.');
  }

  if (utilizador.conta_bloqueada) {
    await supabase.auth.signOut();
    throw new Error('A sua conta está bloqueada. Contacte o suporte.');
  }

  return utilizador as Paciente;
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function subscribeToMudancasAuth(
  callback: (paciente: Paciente | null) => void
) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (!session?.user) {
      callback(null);
      return;
    }

    const { data: utilizador } = await supabase
      .from('utilizadores')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (utilizador?.perfil === 'PACIENTE') {
      callback(utilizador as Paciente);
    } else {
      callback(null);
    }
  });
}
