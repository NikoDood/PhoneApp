import React, { useState, useEffect, useRef } from "react";
import {
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
import styles from "../../styling/noteScreen";

import { ConfirmationModal } from "../../components/ConfirmationModal";

export default function NoteDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const layout = useWindowDimensions();

  const [noteText, setNoteText] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [userId, setUserId] = useState(null);
  const [owner, setOwner] = useState(null);
  const [location, setLocation] = useState(null);
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "edit", title: "Edit Note" },
    { key: "map", title: "Map" },
  ]);
  const [isModalVisible, setIsModalVisible] = useState(false);

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
        setOwner(noteData.owner);
      } else {
        Alert.alert("Error", "Note not found");
      }
    } catch (error) {
      Alert.alert("Error loading note", error.message);
    }
  }

  const isValidLocation = (loc) =>
    loc &&
    typeof loc === "object" &&
    "latitude" in loc &&
    "longitude" in loc &&
    typeof loc.latitude === "number" &&
    typeof loc.longitude === "number";

  async function saveNote(updatedText) {
    try {
      const textToSave =
        typeof updatedText === "string" ? updatedText : noteText; // Default to current noteText if none is passed
      const locationToSave = isValidLocation(location) ? location : null;

      await updateDoc(doc(firestoreDB, `notes`, id), {
        text: textToSave,
        location: locationToSave,
      });

      setNoteText(textToSave); // Update local state
      Alert.alert("Note updated successfully!");
    } catch (error) {
      Alert.alert("Error saving note", error.message);
      console.error(error.message);
    }
  }

  async function confirmDeleteNote() {
    setIsModalVisible(false);
    try {
      await deleteDoc(doc(firestoreDB, `notes`, id));
      Alert.alert("Note deleted successfully!");
      router.push("/");
    } catch (error) {
      Alert.alert("Error deleting note", error.message);
      console.error(error.message);
    }
  }

  const handleMapLongPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLocation({ latitude, longitude });
  };

  const EditNoteTab = React.memo(() => {
    const [localNoteText, setLocalNoteText] = useState(noteText);
    const inputRef = useRef(null);

    useEffect(() => {
      // Sync local state with parent tab state
      setLocalNoteText(noteText);
    }, [noteText]);

    const handleSave = () => {
      // Dismiss the keyboard trying to fix saving issue
      Keyboard.dismiss();
      saveNote(localNoteText);
    };

    const handleSubmitEditing = () => {
      setNoteText(localNoteText);
    };

    return (
      <View style={styles.tabContainer}>
        <TextInput
          ref={inputRef}
          style={styles.noteInput}
          value={localNoteText}
          onChangeText={(text) => setLocalNoteText(text)} // Always store plain text
          onSubmitEditing={() => saveNote(localNoteText)} // Pass the current string directly
          placeholder="Edit your note here..."
          multiline
          returnKeyType="done"
        />
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.noteImage} />
        )}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
        {owner == userId && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setIsModalVisible(true)}
          >
            <Text style={styles.deleteButtonText}>Delete Note</Text>
          </TouchableOpacity>
        )}
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
      <TouchableOpacity
        style={styles.saveButton}
        onPress={() => saveNote(noteText)}
      >
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
