import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
  useWindowDimensions,
  Keyboard,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { firestoreDB, auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { TabView, SceneMap } from "react-native-tab-view";

import { ConfirmationModal } from "../../components/ConfirmationModal";

export default function NoteDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const layout = useWindowDimensions();

  const [noteText, setNoteText] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [userId, setUserId] = useState(null);
  const [location, setLocation] = useState(null);
  const [index, setIndex] = useState(0); // TabView index
  const [routes] = useState([
    { key: "edit", title: "Edit Note" },
    { key: "map", title: "Map" },
  ]);
  const [isModalVisible, setIsModalVisible] = useState(false); // State for modal visibility

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        loadNote();
      } else {
        router.push("/login/LoginScreen");
      }
    });
    return unsubscribe;
  }, [router]);

  async function loadNote() {
    try {
      const noteDoc = await getDoc(doc(firestoreDB, `notes`, id));
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

  async function saveNote(updatedText) {
    try {
      await updateDoc(doc(firestoreDB, `notes`, id), {
        text: updatedText, // Use the passed value
        location: location,
      });
      setNoteText(updatedText); // Update parent state to reflect saved changes
      Alert.alert("Note updated successfully!");
    } catch (error) {
      Alert.alert("Error saving note", error.message);
    }
  }

  async function confirmDeleteNote() {
    setIsModalVisible(false); // Close modal
    try {
      await deleteDoc(doc(firestoreDB, `notes`, id));
      Alert.alert("Note deleted successfully!");
      router.push("/");
    } catch (error) {
      Alert.alert("Error deleting note", error.message);
    }
  }

  const handleMapLongPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLocation({ latitude, longitude });
  };

  const EditNoteTab = React.memo(() => {
    const [localNoteText, setLocalNoteText] = useState(noteText); // Local state for the text
    const inputRef = useRef(null); // Reference to the TextInput

    useEffect(() => {
      setLocalNoteText(noteText); // Sync local state with parent state
    }, [noteText]);

    const handleSave = () => {
      Keyboard.dismiss(); // Dismiss the keyboard
      saveNote(localNoteText); // Use localNoteText directly
    };

    const handleSubmitEditing = () => {
      setNoteText(localNoteText); // Sync the text when submitted
    };

    return (
      <View style={styles.tabContainer}>
        <TextInput
          ref={inputRef}
          style={styles.noteInput}
          value={localNoteText}
          onChangeText={setLocalNoteText}
          onSubmitEditing={handleSubmitEditing} // Triggered when the user submits input
          placeholder="Edit your note here..."
          multiline
          returnKeyType="done" // Customize the keyboard return key
        />
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.noteImage} />
        )}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Text style={styles.deleteButtonText}>Delete Note</Text>
        </TouchableOpacity>
      </View>
    );
  });

  const MapTab = () => (
    <View style={styles.tabContainer}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 55.6761,
          longitude: 12.5683,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onLongPress={handleMapLongPress}
      >
        {location && <Marker coordinate={location} />}
      </MapView>
      <TouchableOpacity style={styles.saveButton} onPress={saveNote}>
        <Text style={styles.saveButtonText}>Save Location</Text>
      </TouchableOpacity>
    </View>
  );

  const renderScene = SceneMap({
    edit: EditNoteTab,
    map: MapTab,
  });

  return (
    <SafeAreaView style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
      />
      <ConfirmationModal
        visible={isModalVisible}
        message="Are you sure you want to delete this note? This action cannot be undone."
        onConfirm={confirmDeleteNote}
        onCancel={() => setIsModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f4",
  },
  tabContainer: {
    flex: 1,
    padding: 20,
  },
  noteInput: {
    fontSize: 18,
    color: "#333",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    backgroundColor: "#fff",
    minHeight: 100,
    marginBottom: 20,
  },
  noteImage: {
    width: "100%",
    height: 200,
    marginBottom: 20,
    borderRadius: 10,
  },
  map: {
    flex: 1,
    borderRadius: 10,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  deleteButton: {
    marginTop: 40,
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
