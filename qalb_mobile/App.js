import { NavigationContainer } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import SplashScreenComponent from './src/components/SplashScreen';
import { AuthProvider } from './src/context/AuthContext';
import { MediaPlaybackProvider } from './src/context/MediaPlaybackContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    void WebBrowser.maybeCompleteAuthSession();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <MediaPlaybackProvider>
            <StatusBar style="light" backgroundColor="transparent" translucent />
            {!splashDone ? (
              <SplashScreenComponent onComplete={() => setSplashDone(true)} />
            ) : (
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            )}
          </MediaPlaybackProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
