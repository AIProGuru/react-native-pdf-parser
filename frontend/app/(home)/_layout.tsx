import { Drawer } from 'expo-router/drawer';
import { useAuth } from '@clerk/clerk-expo';
import { Redirect, useRouter } from 'expo-router';
import { AppState, Text } from 'react-native';
import { useEffect, useRef } from 'react';

export default function HomeLayout() {
  const { isLoaded, isSignedIn, signOut, getToken } = useAuth();
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  if (!isLoaded) return <Text>Loading...</Text>;
  if (!isSignedIn) return <Redirect href="/sign-in" />;

  return <Drawer />;
}
