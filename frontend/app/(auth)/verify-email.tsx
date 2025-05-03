import { useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';

export default function VerifyEmail() {
  const { signUp, setActive } = useSignUp();
  const [code, setCode] = useState('');
  const router = useRouter();

  const onPressVerify = async () => {
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      }
    } catch (err) {
      console.error('Verification failed:', err);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>Enter the code sent to your email</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="Verification Code"
        autoCapitalize="none"
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />
      <Button title="Verify Email" onPress={onPressVerify} />
    </View>
  );
}

