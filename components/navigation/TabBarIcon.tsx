// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/

import Ionicons from "@expo/vector-icons/Ionicons";
import { type IconProps } from "@expo/vector-icons/build/createIconSet";
import { type ComponentProps } from "react";

export function TabBarIcon({
  name,
  style,
  ...rest
}: Omit<IconProps<ComponentProps<typeof Ionicons>["name"]>, "name"> & {
  name: ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <Ionicons
      size={28}
      style={[{ marginBottom: -3 }, style]}
      name={name}
      {...rest}
    />
  );
}

// Example usage for Chats, Map, and Logout icons
export function ChatsIcon(
  props: Omit<IconProps<ComponentProps<typeof Ionicons>["name"]>, "name">
) {
  return <TabBarIcon name="chatbubbles-outline" {...props} />;
}

export function MapIcon(
  props: Omit<IconProps<ComponentProps<typeof Ionicons>["name"]>, "name">
) {
  return <TabBarIcon name="map-outline" {...props} />;
}

export function LogoutIcon(
  props: Omit<IconProps<ComponentProps<typeof Ionicons>["name"]>, "name">
) {
  return <TabBarIcon name="log-out-outline" {...props} />;
}
