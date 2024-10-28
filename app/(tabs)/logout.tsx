import React from "react";
import { View, Text, Alert, StyleSheet, TouchableOpacity } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../services/firebase"; // Adjust the import path
import { useRouter } from "expo-router"; // Import router for navigation

const LogoutTab: React.FC = () => {
  const router = useRouter(); // Initialize router

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("Success", "Logged out successfully");
      router.push("/"); // Redirect to index page
    } catch (error: any) {
      console.error("Logout error:", error);
      Alert.alert("Logout error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Log Out</Text>
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
  button: {
    padding: 15,
    borderRadius: 8,
    backgroundColor: "#ff4d4d",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default LogoutTab;
