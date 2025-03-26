import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { View, Text } from "react-native";
import { AuthContextProvider } from "@/context/AuthContext";

export default function RootLayout() {
 
  return (
    <AuthContextProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="unauthorized" options={{ headerShown: false }} />
      </Stack>
    </AuthContextProvider>
  );
}