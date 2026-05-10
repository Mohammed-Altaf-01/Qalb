import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

import AhadithBooksScreen from '../screens/AhadithBooksScreen';
import AhadithChaptersScreen from '../screens/AhadithChaptersScreen';
import AhadithSectionScreen from '../screens/AhadithSectionScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import HomeScreen from '../screens/HomeScreen';
import JourneyScreen from '../screens/JourneyScreen';
import LibraryScreen from '../screens/LibraryScreen';
import GoalsScreen from '../screens/GoalsScreen';
import ListenScreen from '../screens/ListenScreen';
import LiveScreen from '../screens/LiveScreen';
import MenuScreen from '../screens/MenuScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ReadScreen from '../screens/ReadScreen';
import SettingsScreen from '../screens/SettingsScreen';
import VerseDetailScreen from '../screens/VerseDetailScreen';
import { COLORS, FONT_SIZE } from '../theme';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

const TAB_ICONS = {
  Home: { default: '⌂', active: '⌂' },
  Discover: { default: '◎', active: '◎' },
  Read: { default: '☰', active: '☰' },
  Journey: { default: '◇', active: '◆' },
  Menu: { default: '⋯', active: '⋯' },
};

function TabIcon({ name, focused }) {
  const icons = TAB_ICONS[name] ?? { default: '●', active: '●' };
  return (
    <Text
      style={{
        fontSize: 22,
        color: focused ? COLORS.accent : COLORS.textFaint,
      }}
    >
      {focused ? icons.active : icons.default}
    </Text>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          paddingTop: 8,
          height: 66,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textFaint,
        tabBarLabelStyle: {
          fontSize: FONT_SIZE.xs - 1,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Read" component={ReadScreen} />
      <Tab.Screen name="Journey" component={JourneyScreen} />
      <Tab.Screen name="Menu" component={MenuScreen} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Main" component={TabNavigator} />
      <RootStack.Screen
        name="VerseDetail"
        component={VerseDetailScreen}
        options={{
          gestureEnabled: true,
          cardStyle: { backgroundColor: COLORS.background },
        }}
      />
      <RootStack.Screen name="Library" component={LibraryScreen} />
      <RootStack.Screen name="Goals" component={GoalsScreen} />
      <RootStack.Screen name="Settings" component={SettingsScreen} />
      <RootStack.Screen name="Listen" component={ListenScreen} />
      <RootStack.Screen name="Live" component={LiveScreen} />
      <RootStack.Screen name="Profile" component={ProfileScreen} />
      <RootStack.Screen name="AhadithBooks" component={AhadithBooksScreen} />
      <RootStack.Screen name="AhadithChapters" component={AhadithChaptersScreen} />
      <RootStack.Screen name="AhadithSection" component={AhadithSectionScreen} />
    </RootStack.Navigator>
  );
}
