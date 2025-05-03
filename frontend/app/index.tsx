// app/index.tsx
import { useAuth } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';
import { Text } from 'react-native';

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <Text>Loading...</Text>; // Wait for Clerk to initialize
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href="/dashboard" />;
}
