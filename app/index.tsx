import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import Login from "./login"
import HomeScreen from "./navigator";
import ProductPage from "./products/product"
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
        <HomeScreen />
      ) : (
        <Login />
      )}
    </View>
  );
}