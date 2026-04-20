// src/navigation/AppNavigator.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

// Screens
import HomeScreen       from '../screens/HomeScreen';
import TrendingScreen   from '../screens/TrendingScreen';
import SearchScreen     from '../screens/SearchScreen';
import ProfileScreen    from '../screens/ProfileScreen';
import SettingsScreen   from '../screens/SettingsScreen';
import PlayerScreen     from '../screens/PlayerScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import ChannelsScreen   from '../screens/ChannelsScreen';
import VIPScreen        from '../screens/VIPScreen';
import SavedScreen      from '../screens/SavedScreen';
import HistoryScreen    from '../screens/HistoryScreen';
import UploadScreen     from '../screens/UploadScreen';
import AuthScreen       from '../screens/AuthScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function TabBar({ state, descriptors, navigation }) {
  const { theme, session, setAuthModal, notifCount } = useApp();
  const insets = useSafeAreaInsets();

  const TABS = [
    { name: 'Home',     icon: '🏠' },
    { name: 'Trending', icon: '🔥' },
    { name: 'Upload',   icon: '➕', isAction: true },
    { name: 'Search',   icon: '🔍' },
    { name: 'Profile',  icon: '👤' },
  ];

  return (
    <View style={[styles.tabBar, { backgroundColor: theme.bg2, borderTopColor: theme.border, paddingBottom: insets.bottom }]}>
      {TABS.map((tab, index) => {
        const focused = state.index === index;
        const onPress = () => {
          if (tab.name === 'Upload') {
            if (session) navigation.navigate('Upload');
            else setAuthModal('login');
            return;
          }
          if (tab.name === 'Profile' && !session) {
            setAuthModal('login');
            return;
          }
          const isFocused = state.routes[state.index]?.name === tab.name;
          if (!isFocused) navigation.navigate(tab.name);
        };

        if (tab.isAction) {
          return (
            <TouchableOpacity key={tab.name} onPress={onPress} style={styles.tabItem} activeOpacity={0.8}>
              <View style={[styles.uploadCircle, { backgroundColor: theme.accent }]}>
                <Text style={{ fontSize: 22, color: '#fff' }}>➕</Text>
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={tab.name} onPress={onPress} style={styles.tabItem} activeOpacity={0.8}>
            <View style={{ position: 'relative' }}>
              <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{tab.icon}</Text>
              {tab.name === 'Profile' && notifCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>{notifCount > 9 ? '9+' : notifCount}</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 9, color: focused ? theme.accent : theme.muted, fontWeight: focused ? '700' : '500', marginTop: 2 }}>
              {tab.name}
            </Text>
            {focused && !tab.isAction && (
              <View style={[styles.activeDot, { backgroundColor: theme.accent }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"     component={HomeScreen} />
      <Tab.Screen name="Trending" component={TrendingScreen} />
      <Tab.Screen name="Upload"   component={UploadScreen} />
      <Tab.Screen name="Search"   component={SearchScreen} />
      <Tab.Screen name="Profile"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useApp();
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: theme.accent,
          background: theme.bg,
          card: theme.bg2,
          text: theme.text,
          border: theme.border,
          notification: theme.accent,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Main"          component={MainTabs} />
        <Stack.Screen name="Player"        component={PlayerScreen} options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
        <Stack.Screen name="Categories"    component={CategoriesScreen} />
        <Stack.Screen name="Channels"      component={ChannelsScreen} />
        <Stack.Screen name="VIP"           component={VIPScreen} />
        <Stack.Screen name="Saved"         component={SavedScreen} />
        <Stack.Screen name="History"       component={HistoryScreen} />
        <Stack.Screen name="Upload"        component={UploadScreen} />
        <Stack.Screen name="Auth"          component={AuthScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="UserProfile"   component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row', height: 60, borderTopWidth: 1,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 6, position: 'relative',
  },
  uploadCircle: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    marginTop: -4,
  },
  badge: {
    position: 'absolute', top: -4, right: -6,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  activeDot: {
    position: 'absolute', bottom: -8, width: 20, height: 2, borderRadius: 1,
  },
});
