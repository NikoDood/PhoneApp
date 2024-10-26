import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image, // Import Image to display the note image
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ref, update, onValue } from "firebase/database";
import { database } from "../../services/firebase.js";

export default function NoteDetail() {
  const { id } = useLocalSearchParams(); // Fetch the noteId passed from NoteTakingApp
  const router = useRouter();
  const [noteText, setNoteText] = useState(""); // Store only the text of the note
  const [imageUrl, setImageUrl] = useState(null); // Store the image URL
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadNote();
  }, [id]);

  function loadNote() {
    const notesRef = ref(database, `notes/${id}`);
    onValue(
      notesRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setNoteText(data.text); // Set the text of the note
          setImageUrl(data.imageUrl || null); // Set the image URL if it exists
        } else {
          Alert.alert("Error", "Note not found");
        }
      },
      (error) => {
        Alert.alert("Error", "Failed to load note: " + error.message);
      }
    );
  }

  function saveNote() {
    const noteRef = ref(database, `notes/${id}`);
    // Update the note with the new text
    update(noteRef, { text: noteText })
      .then(() => {
        setIsEditing(false);
        Alert.alert("Success", "Note updated successfully!");
      })
      .catch((error) => {
        Alert.alert("Error", "Failed to save note: " + error.message);
      });
  }

  function handleEdit() {
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    loadNote(); // Reload original note
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        {!isEditing && (
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.noteContainer}>
        {isEditing ? (
          <TextInput
            style={styles.noteInput}
            value={noteText} // Use noteText for editing
            onChangeText={setNoteText} // Set the new text
            multiline
          />
        ) : (
          <View>
            {/* Ensure all text content is within a <Text> component */}
            <Text style={styles.noteText}>{noteText}</Text>
            {imageUrl && (
              <Image source={{ uri: imageUrl }} style={styles.noteImage} />
            )}
          </View>
        )}
      </View>

      {isEditing && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={saveNote}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f4f4f4",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#007bff",
    borderRadius: 5,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  editButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#28a745",
    borderRadius: 5,
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "bold",
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
    width: 100, // Adjust width as needed
    height: 100, // Adjust height as needed
    marginTop: 10, // Spacing above the image
    borderRadius: 10, // Optional: Add rounded corners
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
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
});
