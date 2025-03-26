import React, { useEffect } from "react";
import { View, Text, Button } from "react-native";
import { db } from "../firebaseConfig"; // Đường dẫn tới file config
import { collection, setDoc, doc } from "firebase/firestore";

const InitializeDatabase = () => {
  const initializeData = async () => {
    try {
      // 1. Collection: users
      await setDoc(doc(db, "users", "user1"), {
        userId: "user1",
        email: "linh@example.com",
        fullName: "Linh",
        phone: "0901234567",
        address: { street: "123 Đường A", city: "HCM", province: "HCM", country: "VN" },
        role: "customer",
        location: { lat: 10.7769, lng: 106.7009 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await setDoc(doc(db, "users", "user2"), {
        userId: "user2",
        email: "tuan@example.com",
        fullName: "Tuấn",
        phone: "0901234568",
        address: { street: "456 Đường B", city: "HCM", province: "HCM", country: "VN" },
        role: "vendor",
        location: { lat: 10.7800, lng: 106.7100 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await setDoc(doc(db, "users", "user3"), {
        userId: "user3",
        email: "nam@example.com",
        fullName: "Nam",
        phone: "0901234569",
        address: { street: "789 Đường C", city: "HCM", province: "HCM", country: "VN" },
        role: "shipper",
        location: { lat: 10.7900, lng: 106.7200 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await setDoc(doc(db, "users", "user4"), {
        userId: "user4",
        email: "huong@example.com",
        fullName: "Hương",
        phone: "0901234570",
        address: { street: "101 Đường D", city: "HCM", province: "HCM", country: "VN" },
        role: "admin",
        location: { lat: 10.7950, lng: 106.7250 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 2. Collection: vendors
      await setDoc(doc(db, "vendors", "vendor1"), {
        vendorId: "vendor1",
        userId: "user2",
        storeName: "Cửa hàng Tuấn",
        description: "Chuyên đồ công nghệ",
        location: { lat: 10.7800, lng: 106.7100 },
        rating: 4.5,
        status: "active",
      });

      // 3. Collection: products
      await setDoc(doc(db, "products", "product1"), {
        productId: "product1",
        vendorId: "vendor1",
        name: "Tai nghe Bluetooth",
        description: "Tai nghe không dây chất lượng cao",
        price: 500000,
        categoryId: "cat1",
        images: ["https://example.com/image1.jpg"],
        views: 100,
        status: "active",
        createdAt: new Date(),
      });

      // 4. Collection: categories
      await setDoc(doc(db, "categories", "cat1"), {
        categoryId: "cat1",
        name: "Tai nghe",
        description: "Danh mục tai nghe công nghệ",
      });

      // 5. Collection: orders
      await setDoc(doc(db, "orders", "order1"), {
        orderId: "order1",
        customerId: "user1",
        vendorId: "vendor1",
        shipperId: "user3",
        items: [{ productId: "product1", quantity: 1, price: 500000 }],
        totalAmount: 500000,
        status: "pending",
        shippingAddress: { street: "123 Đường A", city: "HCM", province: "HCM", country: "VN" },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 6. Collection: inventory
      await setDoc(doc(db, "inventory", "inv1"), {
        inventoryId: "inv1",
        productId: "product1",
        vendorId: "vendor1",
        quantity: 50,
        lastUpdated: new Date(),
      });

      // 7. Collection: payments
      await setDoc(doc(db, "payments", "pay1"), {
        paymentId: "pay1",
        orderId: "order1",
        amount: 500000,
        method: "COD",
        status: "pending",
        createdAt: new Date(),
      });

      // 8. Collection: transactions
      await setDoc(doc(db, "transactions", "trans1"), {
        transactionId: "trans1",
        orderId: "order1",
        amount: 500000,
        type: "payment",
        status: "completed",
        createdAt: new Date(),
      });

      // 9. Collection: reviews
      await setDoc(doc(db, "reviews", "rev1"), {
        reviewId: "rev1",
        productId: "product1",
        customerId: "user1",
        rating: 4,
        comment: "Sản phẩm tốt, giao hàng nhanh",
        createdAt: new Date(),
      });

      // 10. Collection: chats
      await setDoc(doc(db, "chats", "chat1"), {
        chatId: "chat1",
        participants: ["user1", "user2"],
        messages: [
          { senderId: "user1", content: "Sản phẩm còn hàng không?", timestamp: new Date() },
          { senderId: "user2", content: "Còn nhé, bạn đặt đi!", timestamp: new Date() },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 11. Collection: notifications
      await setDoc(doc(db, "notifications", "notif1"), {
        notificationId: "notif1",
        userId: "user1",
        title: "Sản phẩm bạn xem",
        message: "Tai nghe Bluetooth đang giảm giá!",
        type: "reminder",
        read: false,
        createdAt: new Date(),
      });

      // 12. Collection: restockRequests
      await setDoc(doc(db, "restockRequests", "req1"), {
        requestId: "req1",
        vendorId: "vendor1",
        productId: "product1",
        quantity: 20,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("Khởi tạo database thành công!");
    } catch (error) {
      console.error("Lỗi khi khởi tạo database:", error);
    }
  };

  useEffect(() => {
    // Chạy lần đầu khi component mount
    // initializeData();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Khởi tạo Database cho E-commerce</Text>
      <Button title="Tạo Database" onPress={initializeData}  />
    </View>
  );
};

export default InitializeDatabase;