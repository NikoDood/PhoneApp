import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { firestoreDB, auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function NoteDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [noteText, setNoteText] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [location, setLocation] = useState(null); // Store location coordinates

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        loadNote(user.uid);
      } else {
        router.push("/login/LoginScreen");
      }
    });
    return unsubscribe;
  }, [router]);

  async function loadNote(userId) {
    try {
      const noteDoc = await getDoc(
        doc(firestoreDB, `users/${userId}/notes`, id)
      );
      if (noteDoc.exists()) {
        const noteData = noteDoc.data();
        setNoteText(noteData.text);
        setImageUrl(noteData.imageUrl || null);
        setLocation(noteData.location || null);
      } else {
        Alert.alert("Error", "Note not found");
      }
    } catch (error) {
      Alert.alert("Error loading note", error.message);
    }
  }

  async function saveNote() {
    try {
      await updateDoc(doc(firestoreDB, `users/${userId}/notes`, id), {
        text: noteText,
        location: location,
      });
      setIsEditing(false);
      Alert.alert("Note updated successfully!");
    } catch (error) {
      Alert.alert("Error saving note", error.message);
    }
  }

  async function deleteNote() {
    try {
      await deleteDoc(doc(firestoreDB, `users/${userId}/notes`, id));
      Alert.alert("Note deleted successfully!");
      router.push("/"); // Redirect to notes list or home after deletion
    } catch (error) {
      Alert.alert("Error deleting note", error.message);
    }
  }

  // Function to handle long-press on the map and set location
  const handleMapLongPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLocation({ latitude, longitude });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.noteContainer}>
        {isEditing ? (
          <TextInput
            style={styles.noteInput}
            value={noteText}
            onChangeText={setNoteText}
            multiline
          />
        ) : (
          <View>
            <Text style={styles.noteText}>{noteText}</Text>
            {imageUrl && (
              <Image source={{ uri: imageUrl }} style={styles.noteImage} />
            )}
          </View>
        )}
      </View>

      {/* MapView loading coords into */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location?.latitude || 37.78825,
          longitude: location?.longitude || -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onLongPress={handleMapLongPress}
      >
        {location && <Marker coordinate={location} />}
      </MapView>

      <View style={styles.buttonContainer}>
        {isEditing ? (
          <>
            <TouchableOpacity style={styles.saveButton} onPress={saveNote}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsEditing(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.deleteButton} onPress={deleteNote}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  deleteButton: {
    flex: 1,
    backgroundColor: "#dc3545",
    padding: 15,
    borderRadius: 10,
  },
  deleteButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f4f4f4",
  },
  noteContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  noteText: {
    fontSize: 18,
    color: "#333",
    textAlign: "center",
  },
  noteInput: {
    fontSize: 18,
    color: "#333",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    width: "100%",
    minHeight: 100,
    backgroundColor: "#fff",
  },
  noteImage: {
    width: 100,
    height: 100,
    marginTop: 10,
    borderRadius: 10,
  },
  map: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
  },
  saveButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#dc3545",
    padding: 15,
    borderRadius: 10,
  },
  cancelButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  editButton: {
    flex: 1,
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 10,
  },
  editButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
});
