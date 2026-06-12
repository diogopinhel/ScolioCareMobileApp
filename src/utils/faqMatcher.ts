import faqDataPt from '../data/faq/escoliose.json';
import faqDataEn from '../data/faq/escoliose.en.json';
import { i18n } from '../i18n';

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
  const faqData = i18n.language === 'en' ? faqDataEn : faqDataPt;
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
    return {
      resposta: i18n.t('assistente.respostaForaAmbito'),
      fonte: i18n.t('assistente.fonteFallback'),
      foraAmbito: true,
    };
  }

  return {
    resposta: melhorEntrada.resposta,
    fonte: melhorEntrada.fonte || i18n.t('assistente.fonteFallback'),
    foraAmbito: false,
  };
}
