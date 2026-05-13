import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { BookOpen, Compass, Headphones, Home, RadioTower, User } from "lucide-react-native";

import AhadithBooksScreen from "../screens/AhadithBooksScreen";
import AhadithChaptersScreen from "../screens/AhadithChaptersScreen";
import AhadithSectionScreen from "../screens/AhadithSectionScreen";
import DiscoverScreen from "../screens/DiscoverScreen";
import GoalsScreen from "../screens/GoalsScreen";
import HomeScreen from "../screens/HomeScreen";
import JourneyScreen from "../screens/JourneyScreen";
import LibraryScreen from "../screens/LibraryScreen";
import ListenScreen from "../screens/ListenScreen";
import LiveScreen from "../screens/LiveScreen";
import MenuScreen from "../screens/MenuScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ReadScreen from "../screens/ReadScreen";
import SettingsScreen from "../screens/SettingsScreen";
import VerseDetailScreen from "../screens/VerseDetailScreen";
import { COLORS, FONT_SIZE } from "../theme";

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

/** Same lucide icons as web `components/Navigation.js` mobile tab bar */
const TAB_ICONS = {
  Read: BookOpen,
  Home,
  Discover: Compass,
  Listen: Headphones,
  Live: RadioTower,
  Profile: User,
};

function TabIcon({ routeName, focused }) {
  const Icon = TAB_ICONS[routeName];
  if (!Icon) return null;
  return <Icon size={22} strokeWidth={focused ? 2.35 : 1.75} color={focused ? COLORS.accent : COLORS.textFaint} />;
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
          fontWeight: "500",
          marginTop: 2,
        },
        tabBarIcon: ({ focused }) => <TabIcon routeName={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Read" component={ReadScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Listen" component={ListenScreen} />
      <Tab.Screen name="Live" component={LiveScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
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
      <RootStack.Screen name="Journey" component={JourneyScreen} />
      <RootStack.Screen name="Menu" component={MenuScreen} />
      <RootStack.Screen name="AhadithBooks" component={AhadithBooksScreen} />
      <RootStack.Screen name="AhadithChapters" component={AhadithChaptersScreen} />
      <RootStack.Screen name="AhadithSection" component={AhadithSectionScreen} />
    </RootStack.Navigator>
  );
}
