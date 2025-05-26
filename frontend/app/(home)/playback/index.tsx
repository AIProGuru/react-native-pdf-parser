import React, { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';
import { Button } from 'react-native-paper'; // Ensure react-native-paper is installed
import { useRouter } from 'expo-router'; // or useNavigation if using React Navigation
import { useVideoPlayer, VideoView } from 'expo-video'
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';


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
  ScrollView
} from 'react-native';

const BASE_URL = 'http://170.130.55.121:5000';

const PlaybackScreen = () => {
  const [audioDialogs, setAudioDialogs] = useState<any[]>([]);
  const [characterSelectVisible, setCharacterSelectVisible] = useState(false);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();

  const router = useRouter();
  const player = useAudioPlayer(null);

  useFocusEffect(
    useCallback(() => {
      const loadAudioData = async () => {
        const stored = await AsyncStorage.getItem('audioDialogs');
        if (stored) {
          setAudioDialogs(JSON.parse(stored));
        }
      };
      loadAudioData();
    }, [])
  );

  const playAudio = async (url: string) => {
    try {
      const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
      player.pause();
      player.replace(fullUrl);
      player.play();
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const characterNames = Array.from(new Set(audioDialogs.map((d) => d.name).filter(Boolean)));

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {/* 🔐 Camera Permission Handling */}
      {!permission || !permission.granted ? (
        <View style={styles.container}>
          <Text style={styles.message}>We need your permission to show the camera</Text>
          <Button onPress={requestPermission}>Grant permission</Button>
        </View>
      ) : (
        <>
          {/* Select & Start Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <Button
              onPress={() => setCharacterSelectVisible(true)}
              mode="outlined"
              style={{ flex: 1, marginRight: 10 }}
            >
              Select Characters
            </Button>
            <Button onPress={() => setShowCamera(true)} mode="contained" style={{ flex: 1 }}>
              Start Audition
            </Button>
          </View>

          {/* Audio Dialog List */}
          {audioDialogs.map((dialog, idx) => (
            <View key={idx} style={{ marginBottom: 12 }}>
              <Text style={{ fontWeight: 'bold' }}>{dialog.name}:</Text>
              <Text>{dialog.text}</Text>
              {dialog.audio && (
                <Button mode="contained" onPress={() => playAudio(dialog.audio)} style={{ marginTop: 8 }}>
                  Play
                </Button>
              )}
              <Modal visible={characterSelectVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                  <View style={styles.characterModal}>
                    <Text style={styles.modalTitle}>Select Characters</Text>
                    <FlatList
                      data={characterNames}
                      keyExtractor={(item) => item}
                      renderItem={({ item }) => {
                        const selected = selectedCharacters.includes(item);
                        return (
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedCharacters((prev) =>
                                selected ? prev.filter((c) => c !== item) : [...prev, item]
                              )
                            }
                            style={[styles.characterOption, selected && styles.characterSelected]}
                          >
                            <Text style={styles.characterOptionText}>
                              {selected ? '✅ ' : ''}
                              {item}
                            </Text>
                          </TouchableOpacity>
                        );
                      }}
                    />
                    <Button onPress={() => setCharacterSelectVisible(false)} style={{ marginTop: 10 }}>
                      Done
                    </Button>
                  </View>
                </View>
              </Modal>
            </View>
          ))}

          {/* Camera Modal */}
          <Modal visible={showCamera} animationType="slide">
            <View style={styles.cameraWrapper}>
              <CameraView style={StyleSheet.absoluteFill} facing={facing} />

              <View style={styles.overlayControls}>
                <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
                  <Text style={styles.text}>Flip</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backButton} onPress={() => setShowCamera(false)}>
                  <Text style={styles.text}>Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </ScrollView>
  );
};


const styles = StyleSheet.create({

  characterModal: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
  },
  characterOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  characterOptionText: {
    fontSize: 16,
  },
  characterSelected: {
    backgroundColor: '#e6f0ff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },

  overlayControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },

  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },

  backButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.6)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },

});

export default PlaybackScreen;
