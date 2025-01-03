import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  AppState,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  writeBatch,
  orderBy,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { firestoreDB, storage, auth } from "../../services/firebase";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import DraggableFlatList from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function NoteTakingApp() {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);
  const [image, setImage] = useState(null);
  const [audio, setAudio] = useState(null);
  const [recording, setRecording] = useState(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const statusUpdatedRef = useRef(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        const userRef = doc(firestoreDB, "users", user.uid);
        updateDoc(userRef, { status: "online" });

        loadNotes(user.uid);
      } else {
        router.push("/login/LoginScreen");
      }
    });

    // Listen to AppState changes (background/foreground)
    const appStateListener = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (nextAppState === "background" || nextAppState === "inactive") {
          if (userId && !statusUpdatedRef.current) {
            const userRef = doc(firestoreDB, "users", userId);
            updateDoc(userRef, { status: "offline" });
            statusUpdatedRef.current = true;
          }
        }
        setAppState(nextAppState);
      }
    );

    // Cleanup function for Auth and AppState
    return () => {
      unsubscribeAuth(); // Unsubscribe from auth listener
      appStateListener.remove(); // Remove appState listener when the component unmounts

      if (userId && !statusUpdatedRef.current) {
        const userRef = doc(firestoreDB, "users", userId);
        updateDoc(userRef, { status: "offline" }); // Set status to "offline" when the component unmounts
      }
    };
  }, [userId, router, appState]);

  const onRefresh = useCallback(() => {
    if (userId) {
      setRefreshing(true);
      loadNotes(userId).then(() => setRefreshing(false));
    } else {
      setRefreshing(false); // Stop the refresh indicator if userId is missing
    }
  }, [userId]);

  const handleDragEnd = useCallback(
    async ({ data }) => {
      // Use a cloned array to avoid mutating original state
      const clonedData = data.map((item, index) => ({
        ...item,
        position: index,
      }));

      setNotes(clonedData);

      // Save the new order to Firestore
      const batch = writeBatch(firestoreDB);
      clonedData.forEach((note) => {
        const noteRef = doc(firestoreDB, `users/${userId}/notes/${note.id}`);
        batch.update(noteRef, { position: note.position });
      });

      try {
        await batch.commit();
        Alert.alert("Notes order saved!");
      } catch (error) {
        Alert.alert("Failed to save order", error.message);
      }
    },
    [userId]
  );

  // Function to pick an image from the galleryss
  async function pickImage() {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission to access gallery is required!");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!pickerResult.canceled && pickerResult.assets[0].uri) {
      setImage(pickerResult.assets[0].uri);
    }
  }

  // Function to capture an image with the camera
  async function takeImage() {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission to access camera is required!");
      return;
    }

    const cameraResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!cameraResult.canceled && cameraResult.assets[0].uri) {
      setImage(cameraResult.assets[0].uri);
    }
  }

  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert("Microphone permission is required! :)");
        return;
      }
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      await recording.startAsync();
      setRecording(recording);
    } catch (error) {
      console.error("Failed to record:", error);
    }
  }

  async function stopRecording() {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudio(uri);
      setRecording(null);
      Alert.alert("Recording saved!");
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }
  }

  async function uploadAudio(noteId) {
    if (!audio) return null;
    setUploading(true);

    const audioRef = storageRef(storage, `notes/${noteId}-audio.m4a`);
    const response = await fetch(audio);
    const blob = await response.blob();
    await uploadBytes(audioRef, blob);

    const url = await getDownloadURL(audioRef);
    setUploading(false);
    return url;
  }

  async function uploadImage(noteId) {
    if (!image) return null;
    setUploading(true);

    const imgRef = storageRef(storage, `notes/${noteId}.jpg`);
    const response = await fetch(image);
    const blob = await response.blob();
    await uploadBytes(imgRef, blob);

    const url = await getDownloadURL(imgRef);
    setUploading(false);
    return url;
  }

  async function handleAddNote() {
    if (!note.trim()) {
      Alert.alert("Note cannot be empty");
      return;
    }

    try {
      const userNotesRef = collection(firestoreDB, `users/${userId}/notes`);

      const highestPosition = notes.length
        ? Math.max(...notes.map((n) => n.position))
        : -1;

      const newNoteRef = await addDoc(userNotesRef, {
        text: note,
        imageUrl: null,
        audioUrl: null,
        createdAt: new Date(),
        position: highestPosition + 1,
      });

      const imageUrl = await uploadImage(newNoteRef.id);
      const audioUrl = await uploadAudio(newNoteRef.id);

      if (imageUrl || audioUrl) {
        await updateDoc(
          doc(firestoreDB, `users/${userId}/notes/${newNoteRef.id}`),
          {
            imageUrl,
            audioUrl,
          }
        );
      }

      setNotes([
        ...notes,
        {
          id: newNoteRef.id,
          text: note,
          imageUrl,
          audioUrl,
          position: highestPosition + 1,
        },
      ]);
      setNote("");
      setImage(null);
      setAudio(null);
      Alert.alert("Note added successfully!");
    } catch (error) {
      Alert.alert("Error adding note", error.message);
    }
  }

  function handlePressNote(noteId) {
    const path = "/note/" + noteId;
    router.push(path);
  }

  async function loadNotes(userId) {
    try {
      const userNotesRef = collection(firestoreDB, `users/${userId}/notes`);
      const q = query(userNotesRef, orderBy("position", "asc"));
      const querySnapshot = await getDocs(q);

      const loadedNotes = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotes(loadedNotes);
    } catch (error) {
      Alert.alert("Failed to load notes", error.message);
    }
  }
  const renderItem = ({ item, drag }) => (
    <TouchableOpacity
      onLongPress={drag}
      style={styles.noteContainer}
      onPress={() => handlePressNote(item.id)}
    >
      <Text style={styles.noteText}>{item.text}</Text>
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.noteImage} />
      )}
      {item.audioUrl && (
        <Button
          title="Play Audio"
          onPress={async () => {
            const { sound } = await Audio.Sound.createAsync({
              uri: item.audioUrl,
            });
            await sound.playAsync();
          }}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <Text style={styles.title}>All notes</Text>
      <SafeAreaView style={styles.container2}>
        {/* Dismiss keyboard on tap outside input */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, justifyContent: "space-between" }}>
            {/* Notes List */}
            <View style={styles.flatListContainer}>
              <DraggableFlatList
                data={notes}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                onDragEnd={handleDragEnd}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh} // Make sure this function fetches new data
                    colors={["#0000ff"]}
                    tintColor="#0000ff"
                  />
                }
              />
            </View>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              {/* Input and Actions */}
              <View style={styles.inputSection}>
                <TextInput
                  style={styles.textInput}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Enter your note here..."
                  multiline
                />

                {/* "+" Button for Action Menu */}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowActionMenu((prev) => !prev)} // Toggle state
                >
                  <Text style={styles.actionButtonText}>+</Text>
                </TouchableOpacity>

                {/* Action Menu */}
                {showActionMenu && (
                  <View style={styles.actionMenu}>
                    <TouchableOpacity
                      onPress={() => {
                        pickImage();
                        setShowActionMenu(false);
                      }}
                      style={styles.menuItem}
                    >
                      <Text style={styles.menuText}>Upload Image</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={takeImage}
                      style={styles.menuItem}
                    >
                      <Text style={styles.menuText}>Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={recording ? stopRecording : startRecording}
                      style={styles.menuItem}
                    >
                      <Text style={styles.menuText}>
                        {recording ? "Stop Recording" : "Record Audio"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Add Note Button */}
                <TouchableOpacity
                  style={styles.addNoteButton}
                  onPress={handleAddNote}
                >
                  <Text style={styles.addNoteButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
            {/* Preview Section */}
            {image && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <TouchableOpacity onPress={() => setImage(null)}>
                  <Text style={styles.removePreview}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
            {uploading && <ActivityIndicator size="small" color="#0000ff" />}
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },

  container2: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  flatListContainer: {},
  noteContainer: {
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  noteText: {
    fontSize: 16,
    color: "#333",
  },
  noteImage: {
    width: "100%",
    height: 200,
    marginTop: 10,
    borderRadius: 8,
    resizeMode: "cover",
  },
  inputSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginRight: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    backgroundColor: "#0084FF",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  actionButtonText: {
    fontSize: 24,
    color: "#fff",
  },
  actionMenu: {
    position: "absolute",
    bottom: 70,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 5,
    zIndex: 10,
    padding: 10,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  menuText: {
    fontSize: 16,
    color: "#333",
  },
  addNoteButton: {
    backgroundColor: "#0084FF",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  addNoteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  previewContainer: {
    padding: 10,
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  imagePreview: {
    width: 100,
    height: 100,
    marginBottom: 10,
    borderRadius: 10,
  },
  removePreview: {
    fontSize: 14,
    color: "red",
  },
});
