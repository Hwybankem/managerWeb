import { View, Text, TouchableOpacity, StyleSheet, Image, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext'; 

export default function HomeScreen() {
  const router = useRouter();
  const {logout} = useAuth(); // Assuming you have a logout function in your auth context

  const LogOut = () => {
    logout()
      .then(() => {
        // Handle successful logout (e.g., navigate to login screen)
        router.push('/login'); // Redirect to login screen
      })
      .catch((error) => {
        console.error("Logout error:", error);
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2b49" />
      <View style={styles.header}>
        <TouchableOpacity onPress={LogOut}> Đăng xuất
          </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý hệ thống</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.welcomeText}>Chào mừng đến với hệ thống quản lý</Text>
        <Text style={styles.subText}>Vui lòng chọn mục bạn muốn truy cập</Text>
        
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/products/product')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#3498db' }]}>
              <Ionicons name="cube-outline" size={32} color="white" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Sản phẩm</Text>
              <Text style={styles.menuDescription}>Quản lý danh sách sản phẩm</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#95a5a6" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/vendors/vendor')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#2ecc71' }]}>
              <Ionicons name="business-outline" size={32} color="white" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Đại lý</Text>
              <Text style={styles.menuDescription}>Quản lý danh sách đại lý</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#95a5a6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/users/user')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#e74c3c' }]}>
              <Ionicons name="people-outline" size={32} color="white" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Người dùng</Text>
              <Text style={styles.menuDescription}>Quản lý danh sách người dùng</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#95a5a6" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2023 Hệ thống quản lý</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#1a2b49',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a2b49',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 30,
  },
  menuContainer: {
    marginTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2b49',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e4e7',
  },
  footerText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
});
