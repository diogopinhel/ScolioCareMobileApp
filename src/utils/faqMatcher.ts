import faqData from '../data/faq/escoliose.json';

type EntradaFAQ = {
  id: string;
  categoria: string;
  pergunta: string;
  palavras_chave: string[];
  resposta: string;
  fonte: string;
};

export type ResultadoFAQ = {
  resposta: string;
  fonte: string;
  foraAmbito: boolean;
};

const FONTE_FALLBACK = 'Base de dados clínica interna';

const RESPOSTA_FORA_AMBITO =
  'Não tenho informação sobre esse tema. Para questões específicas sobre o seu caso, consulte o seu médico ou reformule a questão.';

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function encontrarResposta(pergunta: string): ResultadoFAQ {
  const normalizado = normalizar(pergunta);
  const entradas = faqData.perguntas as EntradaFAQ[];

  let melhorEntrada: EntradaFAQ | null = null;
  let melhorScore = 0;

  for (const entrada of entradas) {
    let score = 0;
    for (const kw of entrada.palavras_chave) {
      if (normalizado.includes(normalizar(kw))) {
        score++;
      }
    }
    if (score > melhorScore) {
      melhorScore = score;
      melhorEntrada = entrada;
    }
  }

  if (!melhorEntrada || melhorScore === 0) {
    return { resposta: RESPOSTA_FORA_AMBITO, fonte: FONTE_FALLBACK, foraAmbito: true };
  }

  return {
    resposta: melhorEntrada.resposta,
    fonte: melhorEntrada.fonte || FONTE_FALLBACK,
    foraAmbito: false,
  };
}
