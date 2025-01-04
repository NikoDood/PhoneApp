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
  useWindowDimensions,
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
  where,
  onSnapshot,
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
import { TabView, SceneMap } from "react-native-tab-view";

const FirstRoute = () => {
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

    // Beta feature (not working) - Listen to AppState changes (background/foreground) - https://reactnative.dev/docs/appstate
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

    return () => {
      unsubscribeAuth();
      appStateListener.remove();

      if (userId && !statusUpdatedRef.current) {
        const userRef = doc(firestoreDB, "users", userId);
        // Set users status to "offline" when the component unmounts and after cleanup
        updateDoc(userRef, { status: "offline" });
      }
    };
  }, [userId, router, appState]);

  const onRefresh = useCallback(() => {
    if (userId) {
      setRefreshing(true);
      loadNotes(userId).then(() => setRefreshing(false));
    } else {
      setRefreshing(false);
    }
  }, [userId]);

  const handleDragEnd = useCallback(async ({ data }) => {
    const clonedData = data.map((item, index) => ({
      ...item,
      position: index,
    }));

    setNotes(clonedData);

    const batch = writeBatch(firestoreDB);
    clonedData.forEach((note) => {
      const noteRef = doc(firestoreDB, `notes/${note.id}`);
      batch.update(noteRef, { position: note.position });
    });

    try {
      await batch.commit();
      Alert.alert("Notes order saved!");
    } catch (error) {
      Alert.alert("Failed to save order", error.message);
    }
  }, []);

  // Function to pick an image from the gallery
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
      const globalNotesRef = collection(firestoreDB, "notes");

      const highestPosition = notes.length
        ? Math.max(...notes.map((n) => n.position))
        : -1;

      const newNoteRef = await addDoc(globalNotesRef, {
        text: note,
        imageUrl: null,
        audioUrl: null,
        createdAt: new Date(),
        owner: userId,
        Participants: [userId],
        position: highestPosition + 1,
      });

      const imageUrl = await uploadImage(newNoteRef.id);
      const audioUrl = await uploadAudio(newNoteRef.id);

      if (imageUrl || audioUrl) {
        await updateDoc(doc(firestoreDB, `notes/${newNoteRef.id}`), {
          imageUrl,
          audioUrl,
        });
      }

      const userSharedRef = collection(
        firestoreDB,
        `users/${userId}/sharedNotes`
      );
      await addDoc(userSharedRef, { noteId: newNoteRef.id });

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
      // Reference to the shared notes subcollection for the user
      const sharedNotesRef = collection(
        firestoreDB,
        `users/${userId}/sharedNotes`
      );

      // Set up a real-time listener on the shared notes using firebase snapshot
      const unsubscribe = onSnapshot(sharedNotesRef, async (sharedSnapshot) => {
        const sharedNoteIds = sharedSnapshot.docs.map(
          (doc) => doc.data().noteId
        );

        if (sharedNoteIds.length === 0) {
          setNotes([]);
          return;
        }

        // Reference to the global notes collection
        const globalNotesRef = collection(firestoreDB, "notes");

        // Query only the shared notes here
        const notesQuery = query(
          globalNotesRef,
          where("__name__", "in", sharedNoteIds)
        );

        // Real-time listener on the filtered notes
        onSnapshot(notesQuery, (notesSnapshot) => {
          const loadedNotes = notesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Sorting the notes by position or createdAt
          const sortedNotes = loadedNotes.sort(
            (a, b) => a.position - b.position || a.createdAt - b.createdAt
          );
          setNotes(sortedNotes);
        });
      });

      return unsubscribe;
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
                    onRefresh={onRefresh}
                    colors={["#0000ff"]}
                    tintColor="#0000ff"
                  />
                }
              />
            </View>

            {/* KeyboardAvoidingView idk if does anything? remove? */}
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ marginBottom: 20 }}
            >
              {/* Input and Actions bar */}
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
                  onPress={() => setShowActionMenu((prev) => !prev)}
                >
                  <Text style={styles.actionButtonText}>+</Text>
                </TouchableOpacity>

                {/* Action Menu popup for button */}
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

            {/* Preview image part */}
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
};

const SecondRoute = () => {
  const [sharedNotes, setSharedNotes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        loadSharedNotes(user.uid);
      } else {
        router.push("/login/LoginScreen");
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, [router]);

  function handlePressNote(noteId) {
    const path = "/note/" + noteId;
    router.push(path);
  }

  const onRefresh = useCallback(() => {
    if (userId) {
      setRefreshing(true);
      loadSharedNotes(userId).then(() => setRefreshing(false));
    } else {
      setRefreshing(false);
    }
  }, [userId]);

  const loadSharedNotes = async (userId) => {
    try {
      const globalNotesRef = collection(firestoreDB, "notes");
      const querySnapshot = await getDocs(globalNotesRef);

      const loadedSharedNotes = querySnapshot.docs
        .map((doc) => {
          const note = doc.data();
          const noteId = doc.id;
          // Check if the user is part of the participants and is not the owner
          if (note.Participants.includes(userId) && note.owner !== userId) {
            return { id: noteId, ...note };
          }
          return null;
        })
        .filter(Boolean);

      setSharedNotes(loadedSharedNotes);
    } catch (error) {
      Alert.alert("Failed to load shared notes", error.message);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
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
      <SafeAreaView style={styles.container2}>
        <Text style={styles.title}>Shared Notes</Text>
        <View style={styles.flatListContainer}>
          <FlatList
            data={sharedNotes}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#0000ff"]}
                tintColor="#0000ff"
              />
            }
          />
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const renderScene = SceneMap({
  first: FirstRoute,
  second: SecondRoute,
});

export default function NoteTakingApp() {
  const layout = useWindowDimensions();
  const [index, setIndex] = React.useState(0);

  const routes = [
    { key: "first", title: "Personal notes" },
    { key: "second", title: "Shared with me" },
  ];

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={{ width: layout.width }}
    />
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
  flatListContainer: {
    height: "70%",
  },
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
    height: 100,
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
    width: 50,
    height: 50,
    marginBottom: 10,
    borderRadius: 10,
  },
  removePreview: {
    fontSize: 14,
    color: "red",
  },
});
