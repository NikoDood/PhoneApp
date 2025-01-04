import { StyleSheet } from "react-native";

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
    backgroundColor: "#007bff",
    alignItems: "center",
    marginTop: 20,
  },
  logoutButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default styles;
