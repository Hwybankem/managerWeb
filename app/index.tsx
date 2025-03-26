import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import Login from "./login"
import InitializeDatabase from "../context/InitializeDatabase";

export default function Home() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/login");
    } catch (err: any) {
      console.error("Logout error:", err.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {user ? (
        <InitializeDatabase />
        // <>
        //   <Text>Chào mừng, {user.email}!</Text>
        //   <TouchableOpacity
        //     style={{
        //       marginTop: 20,
        //       padding: 10,
        //       backgroundColor: "#ff4444",
        //       borderRadius: 5,
        //     }}
        //     onPress={handleLogout}
        //   >
        //     <Text style={{ color: "#fff", fontWeight: "bold" }}>Đăng Xuất</Text>
        //   </TouchableOpacity>
        // </>
      ) : (
        <Login />
      )}
    </View>
  );
}