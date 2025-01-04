import { StyleSheet } from "react-native";

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

export default styles;
