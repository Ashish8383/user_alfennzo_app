import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SendOTPScreen from '../screens/auth/SendOTPScreen';
import VerifyOTPScreen from '../screens/auth/VerifyOTPScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator 
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: true,
        animation: 'slide_from_right',
        presentation: 'card',
      }}
    >
      <Stack.Screen 
        name="SendOTP" 
        component={SendOTPScreen}
        options={{
          gestureEnabled: false, // Disable gesture on first screen
        }}
      />
      <Stack.Screen 
        name="VerifyOTP" 
        component={VerifyOTPScreen}
        options={{
          gestureEnabled: true, 
          gestureDirection: 'horizontal',
        }}
      />
    </Stack.Navigator>
  );
}