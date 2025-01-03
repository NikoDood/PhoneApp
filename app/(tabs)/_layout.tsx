import { Tabs } from "expo-router";
import React from "react";

import {
  TabBarIcon,
  ChatsIcon,
  MapIcon,
  LogoutIcon,
} from "@/components/navigation/TabBarIcon";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function Layout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="ChatOverview"
        options={{
          title: "Chats",
          tabBarIcon: (props) => <ChatsIcon color={props.color} />,
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: "Notes",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "home" : "home-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="markers"
        options={{
          title: "Notes map",
          tabBarIcon: (props) => <MapIcon color={props.color} />,
        }}
      />

      <Tabs.Screen
        name="logout"
        options={{
          title: "Logout",
          tabBarIcon: (props) => <LogoutIcon color={props.color} />,
        }}
      />
    </Tabs>
  );
}
