import React, { useState, useEffect } from "react";
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
  ActivityIndicator, // Loader indicator
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, push, onValue, update } from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { database, storage } from "../../services/firebase.js"; // Firebase configuration
import { useRouter } from "expo-router";

export default function NoteTakingApp() {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);
  const [image, setImage] = useState(null);
  const [imageSelected, setImageSelected] = useState(false); // To indicate image selection
  const [uploading, setUploading] = useState(false); // For showing loader
  const router = useRouter();

  useEffect(() => {
    loadNotes();
  }, []);

  async function takeImage() {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission required",
          "Permission to access the camera is required!"
        );
        return;
      }

      let cameraResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      console.log("Camera result:", cameraResult);

      if (
        !cameraResult.canceled &&
        cameraResult.assets &&
        cameraResult.assets[0].uri
      ) {
        setImage(cameraResult.assets[0].uri);
        setImageSelected(true);
        console.log("Image taken:", cameraResult.assets[0].uri);
      } else {
        console.log("Camera was canceled or no valid image URI found.");
      }
    } catch (error) {
      console.error("Error taking image:", error.message);
      Alert.alert("Error", "Failed to take photo");
    }
  }

  // Pick and create an image from gallery and store it in expo before uploading to firebase
  async function pickImage() {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission required",
          "Permission to access gallery is required!"
        );
        return;
      }
      // Restrict to images only
      let pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      // Log the picker result to debug
      console.log("Picker result:", pickerResult);

      if (
        !pickerResult.canceled &&
        pickerResult.assets &&
        pickerResult.assets[0].uri
      ) {
        // Extract image URI properly
        setImage(pickerResult.assets[0].uri);
        // Set image selected to true
        setImageSelected(true);
        console.log("Image picked:", pickerResult.assets[0].uri);
      } else {
        console.log("Image picker was canceled or no valid image URI found.");
      }
    } catch (error) {
      console.error("Error picking image:", error.message);
      Alert.alert("Error", "Failed to pick image");
    }
  }

  // Upload image to Firebase Storage
  async function uploadImage(noteKey) {
    try {
      if (!image) {
        console.error("No image selected for upload.");
        return null;
      }
      // showing loader
      setUploading(true);
      console.log("Uploading image...");
      const imgRef = storageRef(storage, `notes/${noteKey}.jpg`);
      // Testing URI is valid and fetchable
      const response = await fetch(image);
      const blob = await response.blob();

      // Upload the image to Firebase Storage
      await uploadBytes(imgRef, blob);

      // Download URL for the uploaded image
      const url = await getDownloadURL(imgRef);
      console.log("Image uploaded, download URL:", url);
      setUploading(false);
      return url;
    } catch (error) {
      // Stop loader if upload fails
      setUploading(false);
      console.error("Error uploading image:", error.message);
      Alert.alert("Error", "Failed to upload image");
      return null;
    }
  }

  // Add note and upload image
  async function handleAddNote() {
    if (note.trim() === "") {
      Alert.alert("Error", "Note cannot be empty");
      return;
    }

    try {
      // Add new note to Firebase
      const notesRef = ref(database, "notes");
      const newNoteRef = push(notesRef, { text: note });

      if (image) {
        const imageUrl = await uploadImage(newNoteRef.key);

        if (imageUrl) {
          // Update note with image URL
          await update(ref(database, `notes/${newNoteRef.key}`), { imageUrl });
          console.log("Note updated with image URL:", imageUrl);
        }
      }

      setNote("");
      setImage(null);
      // Reset image selected state
      setImageSelected(false);
      Alert.alert("Success", "Note added successfully!");
    } catch (error) {
      console.error("Error adding note:", error.message);
      Alert.alert("Error", "Failed to add note");
    }
  }

<<<<<<< Updated upstream
  // Load notes from Firebase Realtime Database
  function loadNotes() {
    const notesRef = ref(database, "notes");
    onValue(
      notesRef,
      (snapshot) => {
        const data = snapshot.val();
        const loadedNotes = data
          ? Object.entries(data).map(([key, value]) => ({
              id: key,
              text: value.text,
              imageUrl: value.imageUrl || null,
            }))
          : [];
        setNotes(loadedNotes);
        console.log("Notes loaded:", loadedNotes);
      },
      (error) => {
        console.error("Error loading notes:", error.message);
        Alert.alert("Error", "Failed to load notes");
=======
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
          console.log(sortedNotes);
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
>>>>>>> Stashed changes
      }
    );
  }

  // Handle note click (navigate to detailed view)
  function handlePressNote(noteId) {
    router.push(`/note/${noteId}`);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={note}
          onChangeText={setNote}
          placeholder="Enter your note here"
        />

        <Button title="Pick an image" onPress={pickImage} />

        <Button title="Take a photo" onPress={takeImage} />

        {image && <Image source={{ uri: image }} style={styles.imagePreview} />}

        {/* Displaying selected image info */}
        {imageSelected && (
          <Text style={styles.imageSelectedText}>Image selected</Text>
        )}

        {/* Show activity indicator when uploading */}
        {uploading && <ActivityIndicator size="small" color="#0000ff" />}

        <Button title="Add Note" onPress={handleAddNote} />
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handlePressNote(item.id)}>
            <View style={styles.noteContainer}>
              <Text style={styles.noteText}>{item.text}</Text>
              {item.imageUrl && (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.noteImage}
                />
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 100,
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  textInput: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  noteContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  noteText: {
    fontSize: 16,
    color: "#333",
  },
  imagePreview: {
    width: 100,
    height: 100,
    marginVertical: 10,
  },
  imageSelectedText: {
    color: "green",
    marginBottom: 10,
    fontWeight: "bold",
  },
  noteImage: {
    width: 100,
    height: 100,
    marginTop: 10,
  },
});
