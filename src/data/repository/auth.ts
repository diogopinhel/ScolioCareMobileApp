import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { Paciente } from '../types';

export interface DadosRegisto {
  email: string;
  password: string;
  nomeCompleto: string;
  dataNascimento: string;
  genero: string;
  cartaoCidadao: string;
  numeroUtente: string | null;
  contacto: string;
  morada: string;
}

export type LoginResult =
  | { paciente: Paciente }
  | { needsTwoFactor: true; email: string };

export async function login(email: string, password: string): Promise<LoginResult> {
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

  if (utilizador.two_factor_ativo) {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (otpError) throw otpError;
    return { needsTwoFactor: true, email };
  }

  return { paciente: utilizador as Paciente };
}

export async function enviarOtpEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
}

export async function verificarOtpEmail(email: string, token: string): Promise<Paciente> {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) throw error;
  if (!data.user) throw new Error('Código inválido ou expirado.');

  const { data: utilizador, error: profileError } = await supabase
    .from('utilizadores')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError) throw profileError;
  if (!utilizador) throw new Error('Perfil de utilizador não encontrado.');

  return utilizador as Paciente;
}

export async function ativar2FA(userId: string): Promise<void> {
  const { error } = await supabase
    .from('utilizadores')
    .update({ two_factor_ativo: true })
    .eq('id', userId);
  if (error) throw error;
}

export async function desativar2FA(userId: string): Promise<void> {
  const { error } = await supabase
    .from('utilizadores')
    .update({ two_factor_ativo: false })
    .eq('id', userId);
  if (error) throw error;
}

export async function registar(dados: DadosRegisto): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: dados.email,
    password: dados.password,
    options: {
      emailRedirectTo: Linking.createURL('email-confirmed'),
      data: {
        nome_completo: dados.nomeCompleto,
        data_nascimento: dados.dataNascimento,
        genero: dados.genero,
        cartao_cidadao: dados.cartaoCidadao,
        numero_utente: dados.numeroUtente,
        contacto: dados.contacto,
        morada: dados.morada,
        perfil: 'PACIENTE',
      },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error('Erro ao criar conta.');

  // O trigger handle_new_user já criou a row em utilizadores (apenas id, nome_completo, perfil).
  // Se há sessão ativa, actualizamos com os campos demográficos via UPDATE (não INSERT).
  if (data.session) {
    const { error: profileError } = await supabase
      .from('utilizadores')
      .update({
        nome_completo: dados.nomeCompleto,
        perfil: 'PACIENTE',
        ativo: true,
        conta_ativada: false,
        conta_bloqueada: false,
        two_factor_ativo: false,
        idioma: 'pt-PT',
        contacto: dados.contacto,
        data_nascimento: dados.dataNascimento,
        genero: dados.genero,
        numero_utente: dados.numeroUtente ?? null,
        morada: dados.morada,
        cartao_cidadao: dados.cartaoCidadao,
      })
      .eq('id', data.user.id);
    if (profileError) throw profileError;
    return { needsEmailConfirmation: false };
  }

  return { needsEmailConfirmation: true };
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function reenviarEmailVerificacao(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

export async function verificarTokenEmail(tokenHash: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'signup',
  });
  if (error) throw error;
}

export async function ativarDoisFatoresAtual(): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Utilizador não autenticado.');
  const { error } = await supabase
    .from('utilizadores')
    .update({ two_factor_ativo: true })
    .eq('id', user.id);
  if (error) throw error;
}

export async function enviarEmailRecuperacaoPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
}

export async function definirNovaPassword(
  email: string,
  token: string,
  novaPassword: string,
): Promise<void> {
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (verifyError) throw verifyError;

  const { error: updateError } = await supabase.auth.updateUser({ password: novaPassword });
  if (updateError) throw updateError;

  await supabase.auth.signOut();
}

export async function obterPacienteAtual(): Promise<Paciente | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: utilizador } = await supabase
    .from('utilizadores')
    .select('*')
    .eq('id', user.id)
    .single();
  if (!utilizador || utilizador.perfil !== 'PACIENTE') return null;
  return utilizador as Paciente;
}

export function subscribeToMudancasAuth(
  callback: (paciente: Paciente | null) => void
) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    // SIGNED_IN is handled explicitly in AuthContext to avoid race conditions
    // with the 2FA pending state. INITIAL_SESSION and TOKEN_REFRESHED are still handled.
    if (event === 'SIGNED_IN') return;

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
