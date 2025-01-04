import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import "react-native-reanimated";
import { auth } from "../services/firebase"; // Ensure the path is correct
import { useRouter } from "expo-router";

import { useColorScheme } from "@/hooks/useColorScheme";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);

      if (!user) {
        // Redirect to login if unauthenticated
        router.replace("/login/LoginScreen"); // Replace the route, clearing the stack
      } else {
        // If the user is authenticated, continue to the desired screen
        router.replace("/home"); // Replace with the home screen or the main page
      }
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, [router]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded || isAuthenticated === null) {
    // Show loading spinner while checking auth state
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="+not-found" />
        <Stack.Screen
          name="note/[id]"
          options={{
            title: "Go Back",
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="chat/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="login/LoginScreen"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />

        <Stack.Screen
          name="signup/index"
          options={{
            title: "Back to login",
            gestureEnabled: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
