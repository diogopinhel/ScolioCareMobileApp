import { ScrollText } from 'lucide-react-native';
import DocumentoLegal, { SeccaoLegal } from '../src/components/DocumentoLegal';
import { useTranslation } from '../src/i18n';

export default function TermosCondicoesScreen() {
  const { t } = useTranslation();

  const seccoes: SeccaoLegal[] = [
    { titulo: t('termosCondicoes.s1Titulo'), corpo: t('termosCondicoes.s1Corpo') },
    { titulo: t('termosCondicoes.s2Titulo'), corpo: t('termosCondicoes.s2Corpo') },
    { titulo: t('termosCondicoes.s3Titulo'), corpo: t('termosCondicoes.s3Corpo') },
    { titulo: t('termosCondicoes.s4Titulo'), corpo: t('termosCondicoes.s4Corpo') },
    {
      titulo: t('termosCondicoes.s5Titulo'),
      corpo: t('termosCondicoes.s5Corpo'),
      bullets: t('termosCondicoes.s5Bullets').split('\n'),
    },
    { titulo: t('termosCondicoes.s6Titulo'), corpo: t('termosCondicoes.s6Corpo') },
    { titulo: t('termosCondicoes.s7Titulo'), corpo: t('termosCondicoes.s7Corpo') },
    { titulo: t('termosCondicoes.s8Titulo'), corpo: t('termosCondicoes.s8Corpo') },
    { titulo: t('termosCondicoes.s9Titulo'), corpo: t('termosCondicoes.s9Corpo') },
    { titulo: t('termosCondicoes.s10Titulo'), corpo: t('termosCondicoes.s10Corpo') },
    { titulo: t('termosCondicoes.s11Titulo'), corpo: t('termosCondicoes.s11Corpo') },
  ];

  return (
    <DocumentoLegal
      titulo={t('termosCondicoes.headerTitulo')}
      icone={<ScrollText size={18} color="#1A6FAF" />}
      ultimaAtualizacao={t('termosCondicoes.ultimaAtualizacao')}
      intro={t('termosCondicoes.intro')}
      aviso={t('termosCondicoes.avisoMedico')}
      seccoes={seccoes}
      rodape={t('termosCondicoes.rodape')}
    />
  );
}
