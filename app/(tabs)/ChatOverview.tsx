import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { collection, onSnapshot, setDoc, doc } from "firebase/firestore";
import { firestoreDB, auth } from "../../services/firebase";
import { useRouter } from "expo-router";
import { Notifications } from "react-native-notifications";

interface Chat {
  id: string;
  chatId: string;
  otherUser: string;
}

export default function ChatOverview(): JSX.Element {
  const [chats, setChats] = useState<Chat[]>([]);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestoreDB, `users/${auth.currentUser?.uid}/chats`),
      (snapshot) => {
        const chatData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Chat[];
        setChats(chatData);
      },
      (error) => {
        console.error("Error fetching chats:", error);
        Alert.alert("Error", "Failed to load chats.");
      }
    );
    return unsubscribe; // Cleanup listener on unmount
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) {
      Alert.alert("Error", "Please enter an email to invite.");
      return;
    }

    try {
      const combinedId =
        auth.currentUser?.uid! < inviteEmail
          ? `${auth.currentUser?.uid}-${inviteEmail}`
          : `${inviteEmail}-${auth.currentUser?.uid}`;

      // Create chat reference
      const chatRef = doc(firestoreDB, `chats`, combinedId);
      await setDoc(chatRef, {
        users: [auth.currentUser?.uid, inviteEmail],
        createdAt: new Date(),
        status: "pending", // Status to indicate pending acceptance
      });

      // Store invite in both users' chats
      await Promise.all(
        [auth.currentUser?.uid!, inviteEmail].map((userId) =>
          setDoc(doc(firestoreDB, `users/${userId}/chats`, combinedId), {
            chatId: combinedId,
            otherUser:
              inviteEmail === userId ? auth.currentUser?.email : inviteEmail,
          })
        )
      );

      // Create invite document
      const inviteRef = doc(firestoreDB, `invites`, combinedId);
      await setDoc(inviteRef, {
        from: auth.currentUser?.uid,
        to: inviteEmail,
        chatId: combinedId,
        status: "pending", // Invitation status: pending/accepted/declined
      });

      // Send notification to the invited user
      Notifications.postLocalNotification({
        title: "You have a new chat invitation!",
        body: `${auth.currentUser?.email} has invited you to chat.`,
        extra: { inviteId: combinedId },
      });

      Alert.alert("Success", "Chat invitation sent successfully!");
    } catch (error) {
      console.error("Error inviting user:", error);
      Alert.alert("Error", "Failed to invite user.");
    }
  };

  const openChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chats</Text>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => openChat(item.chatId)}
          >
            <Text style={styles.chatText}>{item.otherUser}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.inviteContainer}>
        <TextInput
          style={styles.input}
          placeholder="Invite by email"
          value={inviteEmail}
          onChangeText={setInviteEmail}
        />
        <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
          <Text style={styles.buttonText}>Invite</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  chatItem: {
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  chatText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  inviteContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  input: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  inviteButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
