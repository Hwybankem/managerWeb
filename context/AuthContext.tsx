import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAuth, User, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { getIdTokenResult } from "firebase/auth";
import { app } from "@/firebaseConfig"; // Đường dẫn có thể thay đổi
import { View, Text } from "react-native";

// Định nghĩa kiểu dữ liệu cho AuthContext
interface AuthContextType {
  user: User | null;
  role: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Tạo Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook tiện ích để sử dụng AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthContextProvider");
  }
  return context;
};

// Provider để bọc toàn bộ ứng dụng
export const AuthContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        const tokenResult = await getIdTokenResult(currentUser);
        setRole(tokenResult.claims.role || null);
      } else {
        setRole(null);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // Hàm đăng ký
  const register = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    setUser(userCredential.user);
  };

  // Hàm đăng nhập
  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    setUser(userCredential.user);

    // Lấy Custom Claims
    const tokenResult = await getIdTokenResult(userCredential.user);
    setRole(tokenResult.claims.role || null);
  };

  // Hàm đăng xuất
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  const value = { user, role, login, register, logout };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Loading...</Text>
        </View>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export default AuthContext;
