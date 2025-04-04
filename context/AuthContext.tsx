import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAuth, User, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, UserCredential } from "firebase/auth";
import { app } from "../config/firebaseConfig"; // Đường dẫn có thể thay đổi
import { View, Text } from "react-native";
import { collection, doc, getDoc, getFirestore, where, query, getDocs, setDoc } from "firebase/firestore";
import { getApps } from "firebase/app";

// Định nghĩa kiểu dữ liệu cho AuthContext
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    address: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  checkRole: (requiredRole: string, email: string) => Promise<boolean>;
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
  const [loading, setLoading] = useState<boolean>(true);
  const db = getFirestore(app);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);


  // Hàm đăng ký
  const register = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    address: string,
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user; 
      await setDoc(doc(db, "users", newUser.uid), {
        userId: newUser.uid, // Lưu Firebase UID
        email,
        fullName,
        phone,
        address,
        role: "customer", // Mặc định là "customer"
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setUser(newUser);
    } catch (error) {
      console.error("Lỗi khi đăng ký:", error);
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log( userCredential.user);
      // Cập nhật user ngay lập tức
      setUser(userCredential.user);
      return userCredential.user;
    } catch (error: any) {
      let errorMessage ;
      if (error.code === 'auth/invalid-email') {
        errorMessage = "Email không hợp lệ. Vui lòng nhập email đúng định dạng.";
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = "Tài khoản đã bị vô hiệu hóa";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "Tài khoản không tồn tại. Vui lòng đăng ký.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Mật khẩu không chính xác. Vui lòng kiểm tra lại.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau.";
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = "Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.";
      }
      throw new Error(errorMessage);
    }
  };

  // Hàm đăng xuất
  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // Hàm checkRole
  const checkRole = async (requiredRole: string, uid: string): Promise<boolean> => {
    try {
      console.log("Bắt đầu kiểm tra quyền:", uid);

      const userDoc = await getDoc(doc(db, "users", uid));

      if (!userDoc.exists()) {
        console.log("Không tìm thấy người dùng với UID:", uid);
        return false;
      }

      const userRole = userDoc.data().role;
      console.log("User role:", userRole);
      console.log("Required role:", requiredRole);
      
      return userRole === requiredRole;
    } catch (error) {
      console.error("Lỗi khi kiểm tra role:", error);
      return false;
    }
  };
  
  const value: AuthContextType = { user, login, register, logout, checkRole };

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