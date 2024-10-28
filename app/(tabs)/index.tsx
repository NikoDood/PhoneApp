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
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { firestoreDB, storage, auth } from "../../services/firebase";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";

export default function NoteTakingApp() {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);
  const [image, setImage] = useState(null);
  const [imageSelected, setImageSelected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        loadNotes(user.uid);
      } else {
        router.push("/login/LoginScreen");
      }
    });

    return unsubscribe;
  }, []);

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
      setImageSelected(true);
    }
  }

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
      setImageSelected(true);
    }
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
      const newNoteRef = await addDoc(userNotesRef, {
        text: note,
        imageUrl: null,
        createdAt: new Date(),
      });

      const imageUrl = await uploadImage(newNoteRef.id);
      if (imageUrl) {
        await updateDoc(
          doc(firestoreDB, `users/${userId}/notes/${newNoteRef.id}`),
          { imageUrl }
        );
      }

      setNotes([...notes, { id: newNoteRef.id, text: note, imageUrl }]);
      setNote("");
      setImage(null);
      setImageSelected(false);
      Alert.alert("Note added successfully!");
    } catch (error) {
      Alert.alert("Error adding note", error.message);
    }
  }

  async function loadNotes(userId) {
    try {
      const userNotesRef = collection(firestoreDB, `users/${userId}/notes`);
      const userNotesQuery = query(userNotesRef);
      const querySnapshot = await getDocs(userNotesQuery);

      const loadedNotes = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotes(loadedNotes);
    } catch (error) {
      Alert.alert("Failed to load notes", error.message);
    }
  }

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
        {imageSelected && (
          <Text style={styles.imageSelectedText}>Image selected</Text>
        )}
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

// Your styles here...

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
