import { Stack } from "expo-router";
import { FirestoreProvider } from "../../context/storageFirebase";

export default function RootLayout() { 
  return (
    <FirestoreProvider>
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="vendor"  />
            <Stack.Screen name="addVendor" options={{ headerShown: false }} />
            <Stack.Screen name="[id]" options={{ headerShown: false }} />
        </Stack>
    </FirestoreProvider>
  );
} 