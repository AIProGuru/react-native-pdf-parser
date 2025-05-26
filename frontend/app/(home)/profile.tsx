import { Text, View, TouchableOpacity } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

export default function Profile() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.replace('/sign-in');
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 20 }}>Profile</Text>
      <Text style={{ fontSize: 16, marginBottom: 40 }}>Manage your session or sign out.</Text>

      <TouchableOpacity
        onPress={handleLogout}
        style={{
          backgroundColor: '#dc3545',
          padding: 15,
          borderRadius: 8,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16 }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
