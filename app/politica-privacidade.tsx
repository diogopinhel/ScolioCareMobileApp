import { Shield } from 'lucide-react-native';
import DocumentoLegal, { SeccaoLegal } from '../src/components/DocumentoLegal';
import { useTranslation } from '../src/i18n';

export default function PoliticaPrivacidadeScreen() {
  const { t } = useTranslation();

  const seccoes: SeccaoLegal[] = [
    { titulo: t('politicaPrivacidade.s1Titulo'), corpo: t('politicaPrivacidade.s1Corpo') },
    {
      titulo: t('politicaPrivacidade.s2Titulo'),
      corpo: t('politicaPrivacidade.s2Corpo'),
      bullets: t('politicaPrivacidade.s2Bullets').split('\n'),
    },
    {
      titulo: t('politicaPrivacidade.s3Titulo'),
      corpo: t('politicaPrivacidade.s3Corpo'),
      destaque: true,
    },
    { titulo: t('politicaPrivacidade.s4Titulo'), corpo: t('politicaPrivacidade.s4Corpo') },
    {
      titulo: t('politicaPrivacidade.s5Titulo'),
      corpo: t('politicaPrivacidade.s5Corpo'),
      bullets: t('politicaPrivacidade.s5Bullets').split('\n'),
    },
    { titulo: t('politicaPrivacidade.s6Titulo'), corpo: t('politicaPrivacidade.s6Corpo') },
    { titulo: t('politicaPrivacidade.s7Titulo'), corpo: t('politicaPrivacidade.s7Corpo') },
    { titulo: t('politicaPrivacidade.s8Titulo'), corpo: t('politicaPrivacidade.s8Corpo') },
    {
      titulo: t('politicaPrivacidade.s9Titulo'),
      corpo: t('politicaPrivacidade.s9Corpo'),
      bullets: t('politicaPrivacidade.s9Bullets').split('\n'),
      corpoFim: t('politicaPrivacidade.s9CorpoFim'),
    },
    { titulo: t('politicaPrivacidade.s10Titulo'), corpo: t('politicaPrivacidade.s10Corpo') },
    { titulo: t('politicaPrivacidade.s11Titulo'), corpo: t('politicaPrivacidade.s11Corpo') },
  ];

  return (
    <DocumentoLegal
      titulo={t('politicaPrivacidade.headerTitulo')}
      icone={<Shield size={18} color="#1A6FAF" />}
      ultimaAtualizacao={t('politicaPrivacidade.ultimaAtualizacao')}
      intro={t('politicaPrivacidade.intro')}
      seccoes={seccoes}
      rodape={t('politicaPrivacidade.rodape')}
    />
  );
}
