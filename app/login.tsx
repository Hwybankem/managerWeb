import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { Link, router, useRouter } from "expo-router";

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { login, user, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (role === "manager") {
        router.replace("/"); // Nếu là Manager, chuyển về trang chính
      } else {
        router.replace("/register"); // Nếu không phải Manager, chuyển hướng khác
      }
    }
  }, [user, role]);
    
  if (user) {
    router.replace("/");
    return null;
  }

  
  const handleLogin = async () => {
    setError(null);

    try {
      await login(email, password);
      router.replace("/");
    } catch (err: any) {
      let errorMessage = "Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.";
      if (err.code === "auth/invalid-credential") {
        errorMessage = "Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.";
      } else if (err.code === "auth/user-not-found") {
        errorMessage = "Tài khoản không tồn tại. Vui lòng đăng ký.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Email không hợp lệ. Vui lòng nhập email đúng định dạng.";
      }
      setError(errorMessage);
    }


     // Nếu đang kiểm tra quyền truy cập
    if (user && role === null) {
      return (
        <View style={styles.errorContainer}>
          <Text>Đang kiểm tra quyền truy cập...</Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng Nhập</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Nhập email của bạn"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Nhập mật khẩu"
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Đăng Nhập</Text>
        </TouchableOpacity>

        <View style={styles.registerLink}>
          <Text style={styles.registerText}>Chưa có tài khoản? </Text>
          <Link href="/register" style={styles.linkText}>
            Đăng ký ngay
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  form: {
    width: "100%",
    maxWidth: 400,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 5,
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  inputError: {
    borderColor: "#d32f2f", // Đổi màu viền input thành đỏ khi có lỗi
  },
  button: {
    width: "100%",
    padding: 15,
    backgroundColor: "#007bff",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorContainer: {
    backgroundColor: "#ffe6e6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#d32f2f",
    alignItems: "center",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 14,
    fontWeight: "500",
  },
  registerLink: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  registerText: {
    fontSize: 14,
    color: "#333",
  },
  linkText: {
    fontSize: 14,
    color: "#007bff",
    textDecorationLine: "underline",
  },
});