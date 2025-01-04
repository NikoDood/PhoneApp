import { StyleSheet } from "react-native";

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

export default styles;
