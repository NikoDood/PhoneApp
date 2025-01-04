import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { firestoreDB, auth } from "../../services/firebase";
import {
  doc,
  updateDoc,
  onSnapshot,
  addDoc,
  collection,
  query,
  orderBy,
  getDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { Notifications } from "react-native-notifications";
import Icon from "react-native-vector-icons/FontAwesome";

import { OpenAI } from "openai";

interface Message {
  id: string;
  text: string;
  sender: string;
  createdAt: Date;
}

const apiKey = "d8a133054a4740c0b396f6a8c756b14d";
const baseURL = "https://api.aimlapi.com/v1";
const systemPrompt = "Be descriptive and helpful";

const api = new OpenAI({
  apiKey,
  baseURL,
});

export default function ChatRoom(): JSX.Element {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");

  const [inviteStatus, setInviteStatus] = useState<string>("");
  const [sender, setSender] = useState<string | null>(null);
  const [receiver, setReceiver] = useState<string | null>(null);
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [senderId, setSenderId] = useState<string | null>(null);
  const [isSender, setIsSender] = useState<boolean>(false);
  const [hasLeft, setHasLeft] = useState<boolean>(false);
  const [chatData, setChatData] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const flatListRef = useRef(null);

  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    // Scroll to the bottom when the component mounts (initial load)
    flatListRef.current?.scrollToEnd({ animated: false });
  }, []);

  const fetchAIResponse = async (userPrompt: string) => {
    const response = await api.chat.completions.create({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 256,
    });
    return response.choices[0].message.content;
  };

  useEffect(() => {
    const inviteRef = doc(firestoreDB, `invites/${chatId}`);
    const unsubscribe = onSnapshot(
      inviteRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const inviteData = snapshot.data();
          setInviteStatus(inviteData?.status);
          setSender(inviteData?.fromEmail);
          setReceiver(inviteData?.toEmail);

          setReceiverId(inviteData?.to);
          setSenderId(inviteData?.from);

          setIsSender(inviteData?.from === auth.currentUser?.uid);
        } else {
          console.error("Invite document does not exist.");
        }
      },
      (error) => {
        console.error("Error fetching invite data:", error);
      }
    );

    return unsubscribe;
  }, [chatId]);

  useEffect(() => {
    const messagesRef = collection(firestoreDB, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messageData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        setMessages(messageData);
      },
      (error) => {
        console.error("Error fetching messages:", error);
        Alert.alert("Error", "Failed to load messages.");
      }
    );

    return unsubscribe;
  }, [chatId]);

  useEffect(() => {
    // Fetch chat data to display and confirm the user is part of the chat
    const chatRef = doc(firestoreDB, `chats/${chatId}`);
    const fetchChatData = async () => {
      try {
        const chatDoc = await getDoc(chatRef);
        if (chatDoc.exists()) {
          setChatData(chatDoc.data());
        }
      } catch (error) {
        console.error("Error fetching chat data:", error);
      }
    };
    fetchChatData();
  }, [chatId]);

  useLayoutEffect(() => {
    const currentUser = auth.currentUser?.uid;
    setUserId(currentUser);

    let OppositeUserMail;
    if (receiverId == auth.currentUser?.uid) {
      OppositeUserMail = sender;
    } else {
      OppositeUserMail = receiver;
    }

    if (OppositeUserMail) {
      navigation.setOptions({
        headerTitle: OppositeUserMail,
      });
    }
  }, [receiver, navigation, router]);

  // Handle Initial Accept Invitation
  const handleAccept = async () => {
    if (isSender) {
      Alert.alert("Error", "You cannot accept your own invitation.");
      return;
    }

    try {
      const chatRef = doc(firestoreDB, `chats/${chatId}`);
      const invitesRef = doc(firestoreDB, `invites/${chatId}`);
      await updateDoc(chatRef, { status: "active" });
      await updateDoc(invitesRef, { status: "active" });

      Alert.alert("Success", "You have accepted the invitation!");
    } catch (error) {
      console.error("Error accepting invitation:", error);
      Alert.alert("Error", "Failed to accept the invitation.");
    }
  };

  // Send Message Functionality :)
  async function sendMessage(customMessage = null) {
    const messageToSend = customMessage?.trim() || newMessage.trim();

    if (messageToSend === "") {
      Alert.alert("Error", "Message cannot be empty.");
      return;
    }

    if (inviteStatus !== "active") {
      Alert.alert(
        "Error",
        "You can only send messages when the chat is active."
      );
      return;
    }

    if (messageToSend.startsWith("!ai")) {
      // Handle AI request from "https://docs.aimlapi.com/quickstart/setting-up"
      const aiResponse = await fetchAIResponse(messageToSend.slice(4).trim());
      await sendMessage(aiResponse);
    } else {
      try {
        const messageRef = collection(firestoreDB, `chats/${chatId}/messages`);
        const newMessageData = {
          text: messageToSend,
          sender: auth.currentUser?.uid,
          createdAt: new Date(),
        };

        await addDoc(messageRef, newMessageData);
        setNewMessage("");
      } catch (error) {
        console.error("Error sending message:", error);
        Alert.alert("Error", "Failed to send the message.");
      }
    }
  }

  // Handle Leave Chat part
  const handleLeaveChat = async () => {
    try {
      if (!chatData || !chatData.users || !userId) return;

      // Check if the user is part of the chat
      if (!chatData.users.includes(userId)) {
        Alert.alert("Error", "You are not part of this chat.");
        return;
      }

      // Step 1: Remove user from chat's users array
      const updatedUsers = chatData.users.filter((id) => id !== userId);

      // Step 2: Add the user to the leftUsers array if they have not left already
      const updatedLeftUsers = chatData.leftUsers || [];
      if (!updatedLeftUsers.includes(userId)) {
        updatedLeftUsers.push(userId);
      }

      // Update the chat document with the modified users and leftUsers arrays
      const chatRef = doc(firestoreDB, `chats/${chatId}`);
      await updateDoc(chatRef, {
        users: updatedUsers,
        leftUsers: updatedLeftUsers,
      });

      // Step 3: Remove chat from the user's chat list
      const userChatRef = doc(firestoreDB, `users/${userId}/chats/${chatId}`);
      await deleteDoc(userChatRef);

      // If the chat is empty (no more users here) then set status to "inactive"
      if (updatedUsers.length === 0) {
        await updateDoc(chatRef, { status: "inactive" });
      }

      setHasLeft(true);

      Alert.alert("Success", "You have left the chat.");
      router.back();
    } catch (error) {
      console.error("Error leaving chat:", error);
      Alert.alert("Error", "Failed to leave the chat.");
    }
  };

  async function sendCustomMsg(customMsg: string) {
    await sendMessage(customMsg);
  }

  async function loadNotes() {
    try {
      const notesRef = collection(firestoreDB, "notes");
      const querySnapshot = await getDocs(notesRef);
      const fetchedNotes = querySnapshot.docs
        .filter((doc) => doc.data().owner === userId)
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      setNotes(fetchedNotes);
    } catch (error) {
      Alert.alert("Error", "Failed to load notes: " + error.message);
    }
  }
  async function shareNote() {
    if (!selectedNote) {
      Alert.alert("Error", "Please select a note first.");
      return;
    }

    const noteMessage = `Join my note: "${selectedNote.text}" - Click here: [Note Link Placeholder]`;

    console.log(newMessage + "Custom message to be sent");

    setShowNoteModal(false);

    try {
      // Add the receiver to the note Participants field
      const noteRef = doc(firestoreDB, `notes/${selectedNote.id}`);
      const noteDoc = await getDoc(noteRef);

      let shareWithUser;
      if (receiverId == auth.currentUser?.uid) {
        shareWithUser = senderId;
      } else {
        shareWithUser = receiverId;
      }

      if (noteDoc.exists()) {
        const currentParticipants = noteDoc.data().Participants || [];
        const updatedParticipants = [
          ...new Set([...currentParticipants, shareWithUser]),
        ];
        console.log(shareWithUser + "IMPORTANT!!!!");

        await updateDoc(noteRef, { Participants: updatedParticipants });
        Alert.alert("Success", "Note shared successfully!");
        await sendCustomMsg(noteMessage + " The note shared");
      } else {
        Alert.alert("Error", "Note does not exist.");
      }
    } catch (error) {
      console.error("Error updating note participants:", error);
      Alert.alert("Error", "Failed to share the note.");
    }
  }

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
        contentContainerStyle={{ paddingBottom: 10 }}
        ref={flatListRef}
        onContentSizeChange={() =>
          flatListRef.current.scrollToEnd({ animated: true })
        }
      />

      {inviteStatus === "pending" && !isSender && (
        <Text style={styles.pendingStatus}>
          Invitation Pending <Icon name="spinner" size={14} color="gray" />
        </Text>
      )}
      {inviteStatus === "pending" && !isSender && (
        <Text style={styles.pendingMessage}>
          You can't send a message until the invite is accepted.
        </Text>
      )}

      {inviteStatus === "active" && !hasLeft && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message"
            value={newMessage}
            onChangeText={setNewMessage}
          />
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowActionMenu((prev) => !prev)}
          >
            <Text style={styles.actionButtonText}>+</Text>
          </TouchableOpacity>
          {showActionMenu && (
            <View style={styles.actionMenu}>
              <TouchableOpacity
                onPress={() => {
                  setShowActionMenu(false);
                  handleLeaveChat();
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuText}>Leave Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowNoteModal(true);
                  loadNotes();
                  setShowActionMenu(false);
                }}
              >
                <Text style={styles.menuText}>Share Note</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => sendMessage(newMessage)}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
      {inviteStatus === "pending" && !isSender && (
        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
          <Text style={styles.buttonText}>Accept Invitation</Text>
        </TouchableOpacity>
      )}

      {inviteStatus === "pending" && isSender && (
        <Text style={styles.pendingMessage}>
          You can't send a message until the invite is accepted.
        </Text>
      )}

      <Modal
        visible={showNoteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowNoteModal(false)}
            >
              <Text style={styles.closeButtonText}>✖</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Share a Note</Text>

            {/* The loaded notes */}
            <FlatList
              data={notes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.noteList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.noteItem,
                    selectedNote?.id === item.id && styles.selectedNoteItem,
                  ]}
                  onPress={() => setSelectedNote(item)}
                >
                  <Text style={styles.noteText}>{item.text}</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity style={styles.shareButton} onPress={shareNote}>
              <Text style={styles.shareButtonText}>Share Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  menuText: {
    fontSize: 16,
    color: "#333",
  },
  actionMenu: {
    position: "absolute",
    bottom: 70,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 5,
    zIndex: 10,
    padding: 10,
  },

  actionButton: {
    marginLeft: 5,
    width: 40,
    height: 40,
    backgroundColor: "#0084FF",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    fontSize: 24,
    color: "#fff",
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
    marginLeft: 5,
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
  leaveButton: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  pendingStatus: {
    color: "gray",
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
  },
  pendingMessage: {
    color: "gray",
    fontSize: 16,
    marginTop: 5,
    textAlign: "center",
  },
  backButton: {
    marginLeft: 10,
  },

  selectedNoteText: {
    fontWeight: "bold",
    color: "#0084FF",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.64)", // Transparent dark overlay
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%", // Adjust modal width as needed
    maxHeight: "80%",
    backgroundColor: "rgba(0, 0, 0, 0.49)",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 10,
    backgroundColor: "#444", // Subtle background for close button
    borderRadius: 50,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "rgb(255, 255, 255)",
    marginBottom: 20,
    textAlign: "center",
  },
  noteList: {
    width: "100%",
    paddingVertical: 20,
  },
  noteItem: {
    padding: 15,
    marginVertical: 10,
    backgroundColor: "#007bff",
    borderRadius: 10,
    alignItems: "center",
  },
  selectedNoteItem: {
    borderColor: "rgb(255, 255, 255)",
    borderWidth: 2,
  },
  noteText: {
    fontSize: 16,
    textAlign: "center",
    color: "rgb(255, 255, 255)",
  },
  modalContent: {
    maxHeight: "70%", // Allow this part to scroll
  },
  shareButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    backgroundColor: "#007bff",
    borderRadius: 10,
  },
  shareButtonText: {
    fontWeight: "bold",
    fontSize: 16,
    color: "rgb(255, 255, 255)",
  },
});
