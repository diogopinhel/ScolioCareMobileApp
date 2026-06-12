import { Tabs } from 'expo-router';
import { Home, FileText, MessageCircle, User } from 'lucide-react-native';
import { useTranslation } from '../../src/i18n';

const BLUE = '#1A6FAF';
const GREY = '#6B7280';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BLUE,
        tabBarInactiveTintColor: GREY,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.inicio'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="exams/index"
        options={{
          title: t('tabs.exames'),
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: t('tabs.assistente'),
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.perfil'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      {/* Rotas escondidas da tab bar — acessíveis via navegação */}
      <Tabs.Screen name="exams/[id]" options={{ href: null }} />
      <Tabs.Screen name="exams/compare" options={{ href: null }} />
      <Tabs.Screen name="exams/evolution" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="wellness-log" options={{ href: null }} />
    </Tabs>
  );
}
