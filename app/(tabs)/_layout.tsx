import { Tabs } from 'expo-router';
import { Home, FileText, MessageCircle, User } from 'lucide-react-native';

const BLUE = '#1A6FAF';
const GREY = '#6B7280';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BLUE,
        tabBarInactiveTintColor: GREY,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          paddingTop: 8,
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
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="exams/index"
        options={{
          title: 'Os meus exames',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Assistente',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      {/* Rota de detalhe — escondida da tab bar, acessível via navegação */}
      <Tabs.Screen
        name="exams/[id]"
        options={{ href: null }}
      />
    </Tabs>
  );
}
