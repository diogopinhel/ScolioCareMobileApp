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

export async function registar(dados: DadosRegisto): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: dados.email,
    password: dados.password,
    options: {
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

  // Se há sessão ativa (confirmação de email desligada), inserir perfil diretamente.
  // Caso contrário, é necessário um trigger PostgreSQL em auth.users para criar o perfil.
  if (data.session) {
    const { error: profileError } = await supabase.from('utilizadores').insert({
      id: data.user.id,
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
    });
    if (profileError) {
      console.warn('[registar] inserção de perfil:', profileError.message);
    }
    return { needsEmailConfirmation: false };
  }

  return { needsEmailConfirmation: true };
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
