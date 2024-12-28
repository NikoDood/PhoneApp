import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { firestoreDB, auth } from "../../services/firebase";
import {
  doc,
  updateDoc,
  onSnapshot,
  addDoc,
  collection,
  query,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { Notifications } from "react-native-notifications";
import Icon from "react-native-vector-icons/FontAwesome";

import { ConfirmationModal } from "../../components/ConfirmationModal";

interface Message {
  id: string;
  text: string;
  sender: string;
  createdAt: Date;
}

export default function ChatRoom(): JSX.Element {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [inviteStatus, setInviteStatus] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const router = useRouter();

  // Listen to chat document status (active and pending)
  useEffect(() => {
    const chatRef = doc(firestoreDB, `chats/${chatId}`);
    const unsubscribe = onSnapshot(chatRef, (snapshot) => {
      const chatData = snapshot.data();
      if (chatData) {
        setInviteStatus(chatData.status);
      }
    });

    return unsubscribe;
  }, [chatId]);

  // Listen to messages in this chat and update state
  useEffect(() => {
    const messagesRef = collection(firestoreDB, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(messageData);
    });

    return unsubscribe;
  }, [chatId]);

  const handleAccept = async () => {
    try {
      const chatRef = doc(firestoreDB, `chats/${chatId}`);
      await updateDoc(chatRef, { status: "active" });

      const inviteRef = doc(firestoreDB, `invites`, chatId);
      await updateDoc(inviteRef, { status: "accepted" });

      // Send notification to both users that chat is now active
      Notifications.postLocalNotification({
        title: "Chat Invitation Accepted!",
        body: "The chat is now active.",
        extra: { chatId: chatId },
      });

      Alert.alert("Success", "You have accepted the invitation!");
    } catch (error) {
      console.error("Error accepting invitation:", error);
      Alert.alert("Error", "Failed to accept the invitation.");
    }
  };

  const sendMessage = async () => {
    if (!newMessage) return;

    try {
      await addDoc(collection(firestoreDB, `chats/${chatId}/messages`), {
        text: newMessage,
        sender: auth.currentUser?.uid,
        createdAt: new Date(),
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const deleteChat = async () => {
    try {
      const chatRef = doc(firestoreDB, `chats/${chatId}`);
      await deleteDoc(chatRef);

      // Optionally, delete associated messages and invitez
      const messagesRef = collection(firestoreDB, `chats/${chatId}/messages`);
      const invitesRef = doc(firestoreDB, `invites/${chatId}`);

      await deleteCollection(messagesRef);
      await deleteDoc(invitesRef);

      router.push("/overview");

      Alert.alert("Success", "Chat deleted successfully!");
    } catch (error) {
      console.error("Error deleting chat:", error);
      Alert.alert("Error", "Failed to delete the chat.");
    }
  };

  // Helper function to delete all documents in a sub-collection :)
  const deleteCollection = async (collectionRef) => {
    const snapshot = await collectionRef.get();
    snapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.message,
              item.sender === auth.currentUser?.uid
                ? styles.sentMessage
                : styles.receivedMessage,
            ]}
          >
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
      />
      {inviteStatus === "pending" && (
        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
          <Text style={styles.buttonText}>Accept Invitation</Text>
        </TouchableOpacity>
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          value={newMessage}
          onChangeText={setNewMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => setShowDeleteModal(true)}
      >
        <Icon name="trash" size={24} color="gray" />
      </TouchableOpacity>

      {/* Confirmation Modal component */}
      <ConfirmationModal
        visible={showDeleteModal}
        message="Are you sure you want to delete this chat?"
        onConfirm={deleteChat}
        onCancel={() => setShowDeleteModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  message: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
  },
  sentMessage: {
    backgroundColor: "#007bff",
    alignSelf: "flex-end",
  },
  receivedMessage: {
    backgroundColor: "grey",
    alignSelf: "flex-start",
  },
  messageText: {
    color: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  sendButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  acceptButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  deleteButton: {
    position: "absolute",
    top: 20,
    left: 20,
    backgroundColor: "transparent",
  },
});
