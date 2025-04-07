import { Stack } from "expo-router";
import { FirestoreProvider } from "../../context/storageFirebase";

export default function RootLayout() { 
  return (
    <FirestoreProvider>
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="user"  />
            <Stack.Screen name="addUser" options={{ headerShown: false }} />
            <Stack.Screen name="[id]" options={{ headerShown: false }} />
        </Stack>
    </FirestoreProvider>
  );
} 