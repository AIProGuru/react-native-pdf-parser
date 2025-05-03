import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Alert, Button, Text, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';

export default function HomeScreen() {
  const { getToken } = useAuth()

  const handleUpload = async () => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({ type: '*/*' });

      if (doc.canceled || !doc.assets?.[0]) return;

      const file = doc.assets[0];

      if (file.size > 5 * 1024 * 1024) {
        Alert.alert('Error', 'File is too large. Please upload a file under 5MB.');
        return;
      }

      const fileUri = file.uri;

      const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const token = await getToken()
      console.log(token)

      const res = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: file.name,
          data: fileBase64,
          mimeType: file.mimeType,
        }),
      });

      const result = await res.json();
      Alert.alert('Result', result.text || 'No script extracted');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to upload and process the document');
    }
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Welcome to the protected Home screen!</Text>
      <Button title="Upload Document" onPress={handleUpload} />
    </View>
  );
}
