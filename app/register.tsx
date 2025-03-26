import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { Link, router } from "expo-router";

export default function Register() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { register, user } = useAuth();

  if (user) {
    router.replace("/");
    return null;
  }

  const handleSubmit = async () => {
    setError(null);

    if (password !== confirmPassword) {
      setError("Mật khẩu và xác nhận mật khẩu không khớp.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    try {
      await register(email, password);
      router.replace("/");
    } catch (err: any) {
      let errorMessage = "Đăng ký thất bại. Vui lòng thử lại.";
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "Email này đã được sử dụng. Vui lòng chọn email khác.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Email không hợp lệ. Vui lòng nhập email đúng định dạng.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.";
      }
      setError(errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng Ký</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, error && styles.inputError]}
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

        <Text style={styles.label}>Xác nhận mật khẩu</Text>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Xác nhận mật khẩu"
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Đăng Ký</Text>
        </TouchableOpacity>

        <View style={styles.loginLink}>
          <Text style={styles.loginText}>Đã có tài khoản? </Text>
          <Link href="/login" style={styles.linkText}>
            Đăng nhập ngay
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
    borderColor: "#d32f2f",
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
  loginLink: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
    color: "#333",
  },
  linkText: {
    fontSize: 14,
    color: "#007bff",
    textDecorationLine: "underline",
  },
});