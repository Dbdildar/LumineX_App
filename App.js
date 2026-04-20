import React, { useState, useEffect } from 'react';
import { StatusBar, View, Modal, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RNBootSplash from "react-native-bootsplash";

// Context & Navigation
import { AppProvider, useApp } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';

// Components & Screens
import { Toast } from './src/components/ui';
import AuthScreen from './src/screens/AuthScreen';
import VideoPlayer from './src/components/player/VideoPlayer';
import AnimatedSplashScreen from './src/screens/AnimatedSplashScreen';

// API
import { videoAPI } from './src/lib/supabase';

function AppContent() {
  const { theme, toast, player, setPlayer, authModal, setAuthModal } = useApp();
  const [related, setRelated] = React.useState([]);

  // Load related videos when player opens
  useEffect(() => {
    if (!player) return;
    videoAPI.getFeed({ limit: 10 })
      .then(data => setRelated(data.filter(v => v.id !== player.id)))
      .catch(() => {});
  }, [player?.id]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={theme.bg === '#030308' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg2}
        translucent={false}
      />

      <AppNavigator />

      {/* Global Video Player Modal */}
      <Modal
        visible={!!player}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPlayer(null)}
      >
        {player && (
          <VideoPlayer
            video={player}
            related={related}
            onClose={() => setPlayer(null)}
          />
        )}
      </Modal>

      {/* Global Auth Modal */}
      <Modal
        visible={!!authModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAuthModal(null)}
      >
        {authModal && (
          <AuthScreen
            route={{ params: { mode: authModal } }}
            navigation={{ 
                goBack: () => setAuthModal(null), 
                canGoBack: () => true, 
                navigate: () => {} 
            }}
          />
        )}
      </Modal>

      {/* Global Toast */}
      <Toast toast={toast} />
    </View>
  );
}

export default function App() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // Perform any essential pre-loading here (e.g., Supabase session check)
        // Then hide the native static splash to reveal the animated one
        await RNBootSplash.hide({ fade: true });
      } catch (error) {
        console.error("Splash initialization failed", error);
      }
    };

    init();
  }, []);

  // Show the Animated Lottie Splash Screen first
  if (visible) {
    return (
        <AnimatedSplashScreen onFinish={() => setVisible(false)} />
    );
  }

  // Once finished, render the main application stack
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
