import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { SafetyProvider } from './src/context/SafetyContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <SafetyProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </SafetyProvider>
    </AuthProvider>
  );
}
