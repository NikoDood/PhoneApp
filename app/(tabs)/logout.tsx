import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth, firestoreDB } from "../../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

const SettingsTab: React.FC = () => {
  const [profileImg, setProfileImg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const router = useRouter();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userDoc = doc(firestoreDB, `users/${userId}`);
      const userSnapshot = await getDoc(userDoc);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        setProfileImg(userData.profileImg || null);
        setName(userData.name || "");
      } else {
        Alert.alert("Error", "User data not found.");
      }
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!userId) return;

    try {
      setUpdating(true);
      const userDoc = doc(firestoreDB, `users/${userId}`);
      await updateDoc(userDoc, {
        profileImg,
        name,
      });
      Alert.alert("Success", "Profile updated successfully.");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("Success", "Logged out successfully");
      router.replace("/login/LoginScreen");
    } catch (error: any) {
      console.error("Logout error:", error);
      Alert.alert("Logout error", error.message);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setProfileImg(uri);
      }
    } catch (error: any) {
      console.error("Image picker error:", error);
      Alert.alert("Error", error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePickImage}>
        <Image
          source={
            profileImg
              ? { uri: profileImg }
              : require("../../assets/images/coop_notes_logo.jpg")
          }
          style={styles.profileImg}
        />
      </TouchableOpacity>
      <Text style={styles.label}>Name:</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Enter your name"
      />
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSaveChanges}
        disabled={updating}
      >
        {updating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  profileImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  input: {
    width: "100%",
    padding: 15,
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  saveButton: {
    width: "100%",
    padding: 15,
    borderRadius: 8,
    backgroundColor: "#007bff",
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  logoutButton: {
    width: "100%",
    padding: 15,
    borderRadius: 8,
    backgroundColor: "#ff4d4d",
    alignItems: "center",
    marginTop: 20,
  },
  logoutButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default SettingsTab;
