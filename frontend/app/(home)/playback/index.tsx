import React, { useEffect, useState, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioPlayer, useAudioPlayer } from 'expo-audio';
import { Button } from 'react-native-paper'; // Ensure react-native-paper is installed
import { useRouter } from 'expo-router'; // or useNavigation if using React Navigation
import { useVideoPlayer, VideoView } from 'expo-video'
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import * as MediaLibrary from 'expo-media-library';
import Voice, {
  SpeechRecognizedEvent,
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@wdragon/react-native-voice';



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
  const [recording, setRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [video, setVideo] = useState<{ uri: string } | undefined>(undefined);
  const [cameraReady, setCameraReady] = useState(false);
  const [speechResults, setSpeechResults] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');



  const router = useRouter();
  const audioPlayer = useAudioPlayer(null);
  const cameraRef = useRef<CameraView>(null);
  const videoPlayer = useVideoPlayer(recordedUri || '', player => {
    player.loop = false;
    player.pause(); // start paused
  });

  const { isPlaying } = useEvent(videoPlayer, 'playingChange', {
    isPlaying: videoPlayer.playing,
  });

  useEffect(() => {
    Voice.onSpeechResults = (e) => {
      console.log('Speech results:', e.value);
      setSpeechResults(e.value || []);
    };

    Voice.onSpeechError = (e) => {
      console.error('Speech error:', e);
      setSpeechError(JSON.stringify(e.error));
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);


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

  const startListening = async () => {
    try {
      setSpeechError('');
      setSpeechResults([]);
      setIsListening(true);
      await Voice.start('en-US');
    } catch (e) {
      console.error('Voice start error:', e);
      setSpeechError('Failed to start voice recognition.');
    }
  };

  const stopListening = async () => {
    try {
      setIsListening(false);
      await Voice.stop();
    } catch (e) {
      console.error('Voice stop error:', e);
    }
  };

  const playAudio = async (url: string) => {
    try {
      const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
      audioPlayer.pause();
      audioPlayer.replace(fullUrl);
      audioPlayer.play();
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const startRecording = async () => {
    if (!cameraReady || !cameraRef.current) {
      console.warn("Camera not ready");
      return;
    }

    try {
      setRecording(true);
      console.log("Recording started...");
      const newVideo = await cameraRef.current.recordAsync({
        maxDuration: 30,
      });
      console.log("Recording finished:", newVideo);

      if (newVideo?.uri) {
        setVideo(newVideo);
        setRecordedUri(newVideo.uri);
        setPreviewVisible(true);
      }

      setRecording(false);
    } catch (error) {
      console.error("Recording error:", error);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current) {
      cameraRef.current.stopRecording();
      setRecording(false);
    }
  };


  const saveToGallery = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted' && recordedUri) {
      await MediaLibrary.saveToLibraryAsync(recordedUri);
      Alert.alert('Saved!', 'Your video has been saved to camera roll.');
      setPreviewVisible(false);
      setRecordedUri(null);
      setShowCamera(false);
    } else {
      Alert.alert('Permission denied', 'Cannot save to gallery.');
    }
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
            <Button
              mode="contained"
              style={{ flex: 1 }}
              onPress={isListening ? stopListening : startListening}
            >
              {isListening ? 'Stop' : 'Testing'}
            </Button>
            {speechResults.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text>Transcription:</Text>
                {speechResults.map((text, idx) => (
                  <Text key={idx} style={{ fontStyle: 'italic' }}>
                    {text}
                  </Text>
                ))}
              </View>
            )}

            {speechError ? <Text style={{ color: 'red' }}>{speechError}</Text> : null}

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
            <View style={styles.container}>
              <CameraView ref={cameraRef} style={styles.camera} facing={facing} onCameraReady={() => setCameraReady(true)} />

              {!recording && (
                <TouchableOpacity style={styles.backIcon} onPress={() => setShowCamera(false)}>
                  <Ionicons name="arrow-back" size={28} color="gray" />
                </TouchableOpacity>
              )}

              {!recording && (
                <TouchableOpacity style={styles.flipIcon} onPress={toggleCameraFacing}>
                  <Ionicons name="camera-reverse-outline" size={28} color="gray" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.recordButton}
                onPress={recording ? stopRecording : startRecording}
              >
                <Ionicons
                  name={recording ? "stop-circle" : "radio-button-on"}
                  size={70}
                  color="red"
                />
              </TouchableOpacity>
            </View>
          </Modal>
          {previewVisible && recordedUri && (
            <Modal visible={previewVisible} animationType="slide">
              <View style={styles.container}>
                <VideoView
                  style={styles.previewVideo}
                  player={videoPlayer}
                  allowsFullscreen
                  allowsPictureInPicture
                />
                <View style={styles.previewControls}>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setPreviewVisible(false);
                      setShowCamera(true);
                    }}
                  >
                    Retake
                  </Button>
                  <Button mode="contained" onPress={saveToGallery}>
                    Save
                  </Button>
                  <Button
                    onPress={() => {
                      setPreviewVisible(false);
                      setRecordedUri(null);
                    }}
                  >
                    Discard
                  </Button>
                </View>
              </View>
            </Modal>
          )}
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

  recordButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  flipIcon: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },

  backIcon: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },

  recordButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    zIndex: 1,
  },

  recordText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  previewVideo: {
    flex: 1,
    width: '100%',
    height: undefined,
    aspectRatio: 16 / 9,
  },
  previewControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
  },

});

export default PlaybackScreen;
