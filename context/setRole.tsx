import admin from "firebase-admin";

// Kiểm tra nếu chưa khởi tạo Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require("./serviceAccountKey.json")), // Đường dẫn file key Firebase Admin
  });
}

const auth = admin.auth();

/**
 * Gán quyền cho user dựa trên email
 * @param email - Email của user cần set role
 * @param role - Vai trò: "cus", "ship", "dealer"
 */
export const setUserRole = async (email: string, role: "cus" | "ship" | "dealer" | null) => {
  try {
    // Tìm user theo email
    const user = await auth.getUserByEmail(email);

    // Gán role vào Custom Claims
    await auth.setCustomUserClaims(user.uid, { role });

    console.log(`✅ Đã cập nhật role cho ${email}: ${role}`);
  } catch (error) {
    console.error("❌ Lỗi khi gán quyền:", error);
  }
};

export default auth;
