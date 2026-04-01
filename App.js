import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './src/store/authStore';
import RootNavigator from './src/navigation/RootNavigator';
import Toast from './src/components/common/Toast';
import { useToastController } from './src/hooks/useToast';
import Loader from './src/components/common/Loader';
import { useLoaderController } from './src/hooks/useLoader';

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const loaderRef = useRef(null);

  const toastRef = useRef(null);
  const { registerHandler } = useToastController();
  const { registerHandler: registerLoader } = useLoaderController();

 useEffect(() => {
    registerHandler((options) => toastRef.current?.show(options));
    registerLoader(
      (options) => loaderRef.current?.show(options),
      ()        => loaderRef.current?.hide(),
    );
  }, [])

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootNavigator />
        <Toast ref={toastRef} />
        <Loader ref={loaderRef} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}