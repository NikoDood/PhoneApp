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
    // Listen for authentication state
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);

      if (!user) {
        // Replace the route, clearing the stack on new session !?
        router.replace("/login/LoginScreen");
      } else {
        // If authenticated go to home
        router.replace("/home");
      }
    });

    return () => unsubscribe();
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
