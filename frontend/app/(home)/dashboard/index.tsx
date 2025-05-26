import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useLayoutEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
// import * as Clipboard from 'expo-clipboard'; // (optional, if needed later for copying names)


import {
  Alert,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';

import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';

import { Button } from 'react-native-paper';
import { useAuth } from '@clerk/clerk-expo';
import { useState } from 'react';

type Dialog = { id: number; name: string; text: string };
type DialogWithAudio = Dialog & {
  audioUri?: string;
  type?: 'ai' | 'user';
};




export default function DashboardScreen() {
  const { getToken } = useAuth();
  const [originalDialogs, setOriginalDialogs] = useState<Dialog[]>([]);
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [fileListVisible, setFileListVisible] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [hasLoadedDialog, setHasLoadedDialog] = useState(false);
  const [audioDialogs, setAudioDialogs] = useState<DialogWithAudio[]>([]);
  const router = useRouter();
  const navigation = useNavigation();

  // Upload and parse file
  const handleUpload = async () => {
    try {
      setLoading(true);
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

      const token = await getToken();
      const res = await fetch('http://170.130.55.121:5000/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: file.name,
          data: fileBase64,
          mimeType: file.mimeType,
        }),
      });

      const result = await res.json();
      if (result.dialogs) {
        setDialogs(result.dialogs);
        setHasLoadedDialog(true);
      } else {
        Alert.alert('Error', 'No dialog extracted');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to upload and process the document');
    } finally {
      setLoading(false);
    }
  };

  const generateAIVoices = async () => {
    console.log(dialogs)
    try {
      const token = await getToken();
      const response = await fetch('http://170.130.55.121:5000/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dialogs }),
      });

      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid response');

      await AsyncStorage.setItem('audioDialogs', JSON.stringify(data));
      setAudioDialogs(data); // Replace dialogs with audio-annotated version
      router.push('/playback')
      console.log(data)
      Alert.alert('Success', 'AI voices generated!');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to generate AI voices');
    }
  };





  // Edit/Cancel Edit toggle
  const handleEditToggle = () => {
    if (!editMode) {
      setOriginalDialogs(JSON.parse(JSON.stringify(dialogs)));
    } else {
      setDialogs(JSON.parse(JSON.stringify(originalDialogs)));
    }
    setEditMode(!editMode);
  };

  const handleSave = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not supported', 'File saving with custom names is not supported on web.');
      return;
    }

    Alert.prompt?.( // iOS-only built-in
      'Save As',
      'Enter a name for this dialog file:',
      async (inputName) => {
        if (!inputName) {
          Alert.alert('Invalid', 'File name cannot be empty');
          return;
        }

        try {
          const fileName = inputName.trim().replace(/[^a-z0-9_-]/gi, '_') + '.json'; // sanitize
          const fileUri = FileSystem.documentDirectory + fileName;
          await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(dialogs));
          Alert.alert('Saved', `Dialogs saved as "${fileName}"`);
          setOriginalDialogs(JSON.parse(JSON.stringify(dialogs)));
          setEditMode(false);
        } catch (error) {
          console.error('Save error:', error);
          Alert.alert('Error', 'Failed to save file');
        }
      },
      'plain-text'
    );

    // Fallback if prompt not available (Android)
    if (!Alert.prompt) {
      const timestamp = Date.now();
      const fileName = `dialog_${timestamp}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;
      try {
        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(dialogs));
        Alert.alert('Saved', `Dialogs saved as "${fileName}"`);
        setOriginalDialogs(JSON.parse(JSON.stringify(dialogs)));
        setEditMode(false);
      } catch (error) {
        console.error('Save error:', error);
        Alert.alert('Error', 'Failed to save file');
      }
    }
  };


  // Load list of JSON files
  const handleLoadSavedDialog = async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory || '');
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      setAvailableFiles(jsonFiles);
      setFileListVisible(true);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to read saved files');
    }
  };

  // Load selected file content
  const loadFileContent = async (filename: string) => {
    try {
      const content = await FileSystem.readAsStringAsync(FileSystem.documentDirectory + filename);
      const parsed = JSON.parse(content);
      setDialogs(parsed);
      setHasLoadedDialog(true);
      setFileListVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load file');
    }
  };

  const updateDialog = (index: number, field: 'name' | 'text', value: string) => {
    setDialogs(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addDialogAt = (index: number) => {
    setDialogs(prev => {
      const copy = [...prev];
      const newDialog = {
        id: Date.now(),
        name: '',
        text: '',
      };
      copy.splice(index + 1, 0, newDialog);
      return copy;
    });
  };

  const deleteDialogAt = (index: number) => {
    setDialogs(prev => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
  };

  const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<Dialog>) => {
    const index = getIndex();
    if (index === undefined) return null;
    return (
      <View
        style={[styles.dialogBlock, {
          backgroundColor: isActive ? '#e0e0e0' : '#f2f2f2',
          flexDirection: 'row',
          alignItems: 'center',
        }]}
      >
        <TouchableOpacity onLongPress={editMode ? drag : undefined} disabled={!editMode}>
          <Text style={styles.dragHandle}>≡</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 10 }}>
          {editMode ? (
            <>
              <TextInput
                style={styles.input}
                value={item.name}
                onChangeText={v => updateDialog(index, 'name', v)}
                placeholder="Character Name"
              />
              <TextInput
                style={styles.input}
                value={item.text}
                onChangeText={v => updateDialog(index, 'text', v)}
                placeholder="Dialog"
                multiline
              />
              <View style={styles.editActions}>
                <TouchableOpacity onPress={() => addDialogAt(index)} style={styles.actionBtn}>
                  <Text style={styles.actionText}>+ Add</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteDialogAt(index)} style={styles.actionBtn}>
                  <Text style={styles.actionText}>🗑 Delete</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.character}>{item.name}:</Text>
              <Text style={styles.line}>{item.text}</Text>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!hasLoadedDialog ? (
        <>
          <Button mode="contained" onPress={handleUpload} style={styles.uploadButton}>
            Upload & Parse Document
          </Button>
          <Button mode="outlined" onPress={handleLoadSavedDialog} style={{ marginBottom: 10 }}>
            Load Saved Dialog
          </Button>
        </>
      ) : (
        <View style={styles.controls}>
          <Button mode="outlined" onPress={handleEditToggle}>
            {editMode ? 'Cancel Edit' : 'Edit Dialog'}
          </Button>

          {editMode && (
            <Button mode="contained" onPress={handleSave} style={{ marginLeft: 10 }}>
              Save
            </Button>
          )}

          <Button
            mode="outlined"
            onPress={() => {
              setDialogs([]);
              setOriginalDialogs([]);
              setEditMode(false);
              setHasLoadedDialog(false);
            }}
            style={styles.loadNewFileButton}
            labelStyle={styles.loadNewFileLabel}
          >
            Back
          </Button>
        </View>
      )}


      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

      {dialogs.length > 0 && (
        <>
          <DraggableFlatList
            data={dialogs}
            onDragEnd={({ data }) => setDialogs(data)}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            scrollEnabled
            contentContainerStyle={{ paddingBottom: 100 }}
          />
          <Button
            mode="contained"
            onPress={generateAIVoices}
            style={{ position: 'absolute', bottom: 10, left: 20, right: 20 }}
          >
            Generate AI Voices
          </Button>
        </>
      )}



      <Modal visible={fileListVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Select a Saved Dialog File</Text>
          <FlatList
            data={availableFiles}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.fileItem}
                onPress={() => loadFileContent(item)}
              >
                <Text style={styles.fileName}>{item}</Text>
              </TouchableOpacity>
            )}
          />
          <Button onPress={() => setFileListVisible(false)} style={{ marginTop: 20 }}>
            Cancel
          </Button>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  uploadButton: { marginBottom: 10 },
  dialogBlock: {
    marginBottom: 15,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
  },
  character: { fontWeight: 'bold', fontSize: 16 },
  line: { fontSize: 15 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 6,
    marginBottom: 5,
    backgroundColor: '#fff',
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow wrapping
    gap: 10,          // Optional: space between buttons
    marginBottom: 10,
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between'
  },
  dragHandle: {
    fontSize: 24,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: '#888',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 5,
  },
  actionBtn: {
    padding: 4,
    backgroundColor: '#ddd',
    borderRadius: 4,
  },
  actionText: {
    fontSize: 13,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  fileItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  fileName: {
    fontSize: 16,
  },
  loadNewFileButton: {
    marginLeft: 10,
    borderColor: '#888',
    borderWidth: 1,
    backgroundColor: '#f9f9f9'
  },

  loadNewFileLabel: {
    color: '#444',
    fontWeight: '500',
  },
});
