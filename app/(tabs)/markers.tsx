import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  Image,
  Button,
  StyleSheet,
} from "react-native";
import MapView, { Marker, Callout, Region } from "react-native-maps";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { firestoreDB, auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface NoteMarker {
  id: string;
  location: { latitude: number; longitude: number };
  noteText: string;
  imageUrl?: string;
}

const AllMarkersMap: React.FC = () => {
  const [markers, setMarkers] = useState<NoteMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentMarkerIndex, setCurrentMarkerIndex] = useState(0);
  const router = useRouter();
  let mapRef = React.useRef<MapView>(null);

  // authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        router.push("/login/LoginScreen");
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (userId) {
      fetchMarkers(userId);
    }
  }, [userId]);

  // Fetch markers from Firestore
  async function fetchMarkers(userId: string) {
    try {
      setLoading(true);
      const userNotesRef = collection(firestoreDB, `users/${userId}/notes`);
      const querySnapshot = await getDocs(userNotesRef);

      const loadedMarkers: NoteMarker[] = querySnapshot.docs
        .map((doc) => {
          const data = doc.data();
          if (data.location) {
            return {
              id: doc.id,
              location: data.location,
              noteText: data.text,
              imageUrl: data.imageUrl,
            };
          }
          return null;
        })
        .filter(Boolean);

      setMarkers(loadedMarkers as NoteMarker[]);
    } catch (error) {
      Alert.alert("Error fetching markers", error.message);
    } finally {
      setLoading(false);
    }
  }

  // Refresh markers
  const handleRefresh = () => {
    if (userId) {
      fetchMarkers(userId);
    }
  };

  if (loading) {
    return (
      <ActivityIndicator size="large" color="#0000ff" style={{ flex: 1 }} />
    );
  }

  const initialRegion: Region = {
    latitude: markers.length ? markers[0].location.latitude : 37.78825,
    longitude: markers.length ? markers[0].location.longitude : -122.4324,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const handleMarkerPress = (markerId: string) => {
    router.push(`/notes/NoteDetail?id=${markerId}`);
  };

  const goToMarker = (index: number) => {
    if (markers.length > 0) {
      const marker = markers[index];
      if (mapRef.current && marker) {
        mapRef.current.animateToRegion(
          {
            latitude: marker.location.latitude,
            longitude: marker.location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          1000
        );
      }
    }
  };

  const handleNextMarker = () => {
    const newIndex = (currentMarkerIndex + 1) % markers.length;
    setCurrentMarkerIndex(newIndex);
    goToMarker(newIndex);
  };

  const handlePreviousMarker = () => {
    const newIndex = (currentMarkerIndex - 1 + markers.length) % markers.length;
    setCurrentMarkerIndex(newIndex);
    goToMarker(newIndex);
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        showsUserLocation={true}
      >
        {markers.map((marker, index) => (
          <Marker
            key={marker.id}
            coordinate={{
              latitude: marker.location.latitude,
              longitude: marker.location.longitude,
            }}
            onPress={() => handleMarkerPress(marker.id)}
          >
            <Callout onPress={() => handleMarkerPress(marker.id)}>
              <View>
                <Text>{marker.noteText}</Text>
                {marker.imageUrl && (
                  <Image
                    source={{ uri: marker.imageUrl }}
                    style={{ width: 50, height: 50, borderRadius: 5 }}
                  />
                )}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      <View style={styles.navContainer}>
        <Button
          title="Previous"
          onPress={handlePreviousMarker}
          disabled={!markers.length}
        />
        <Text style={styles.markerText}>
          {markers.length
            ? `Viewing Marker ${currentMarkerIndex + 1} of ${markers.length}`
            : "No markers available"}
        </Text>
        <Button
          title="Next"
          onPress={handleNextMarker}
          disabled={!markers.length}
        />
        <Button title="Refresh" onPress={handleRefresh} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    marginHorizontal: 20,
    padding: 5,
  },
  markerText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
});

export default AllMarkersMap;
