import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, SafeAreaView, Platform, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { useFirestore } from '../../context/storageFirebase';
import removeAccents from '@/components/utils/stringUtils';
import BackButton from '@/components/common/UI/backButton';
import AddButton from '@/components/common/UI/addButton';

interface User {
    id: string;
    username: string;
    fullName: string;
    phone: string;
    role: 'admin' | 'manager' | 'dealer' | 'shipper';
    avatar: string;
    createdAt: Date;
    updatedAt: Date;
}



export default function UserList() {
    const { getDocuments, deleteDocument } = useFirestore();
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const roles = ['admin', 'customer', 'dealer', 'shipper'];

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        filterUsers(searchQuery, selectedRole);
    }, [searchQuery, selectedRole, users]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Load users
            const usersData = await getDocuments('users');
            const formattedUsers: User[] = usersData.map((user: any) => ({
                id: user.id,
                username: user.username,
                fullName: user.fullName || '',
                phone: user.phone || '',
                role: user.role || 'staff',
                avatar: user.avatar || '',
                createdAt: user.createdAt?.toDate() || new Date(),
                updatedAt: user.updatedAt?.toDate() || new Date()
            }));

            setUsers(formattedUsers);
            setFilteredUsers(formattedUsers);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu người dùng:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    const filterUsers = (query: string, role: string | null) => {
        let filtered = [...users];

        // Lọc theo tìm kiếm tên
        if (query.trim()) {
            const searchTerms = removeAccents(query.toLowerCase()).split(' ').filter(term => term);
            filtered = filtered.filter(user => {
                const userName = removeAccents((user.fullName || user.username).toLowerCase());
                return searchTerms.every(term => userName.includes(term));
            });
        }

        // Lọc theo vai trò
        if (role) {
            filtered = filtered.filter(user => user.role === role);
        }

        setFilteredUsers(filtered);
    };

    const handleUserPress = (user: User) => {
        router.push({
            pathname: "/users/[id]",
            params: { id: user.id }
        } as any);
    };

    const handleRoleSelect = (role: string) => {
        setSelectedRole(role);
        setShowRoleModal(false);
    };

    const clearRoleFilter = () => {
        setSelectedRole(null);
    };

    const confirmDeleteUser = (user: User) => {
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            await deleteDocument('users', userToDelete.id);
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            setFilteredUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            Alert.alert('Thành công', 'Đã xóa người dùng');
        } catch (error) {
            console.error('Lỗi khi xóa người dùng:', error);
            Alert.alert('Lỗi', 'Không thể xóa người dùng');
        } finally {
            setShowDeleteModal(false);
            setUserToDelete(null);
        }
    };

    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case 'admin':
                return styles.adminBadge;
            case 'dealer':
                return styles.dealerBadge;
            case 'shipper':
                return styles.shipperBadge;
            default:
                return styles.customerBadge;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainContent}>
                <View style={styles.header}>
                    <BackButton path={'/navigator'} />
                    <Text style={styles.title}>Danh sách người dùng</Text>
                    <AddButton path={'/users/addUser'} text={'người dùng'} />
                </View>

                <View style={styles.filtersContainer}>
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm kiếm người dùng..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={() => setSearchQuery('')}
                            >
                                <Text style={styles.clearButtonText}>×</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.roleFilterContainer}>
                        <TouchableOpacity
                            style={styles.roleButton}
                            onPress={() => setShowRoleModal(true)}
                        >
                            <Text style={styles.roleButtonText}>
                                {selectedRole ? `Vai trò: ${selectedRole}` : 'Chọn vai trò'}
                            </Text>
                        </TouchableOpacity>

                        {selectedRole && (
                            <TouchableOpacity
                                style={styles.clearRoleButton}
                                onPress={clearRoleFilter}
                            >
                                <Text style={styles.clearRoleButtonText}>×</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <FlatList
                    data={filteredUsers}
                    renderItem={({ item }) => (
                        <View style={styles.userCard}>
                            <TouchableOpacity
                                style={styles.userInfo}
                                onPress={() => handleUserPress(item)}
                            >
                                <View style={styles.avatarContainer}>
                                    <Image
                                        source={{ uri: item.avatar || 'https://via.placeholder.com/150?text=User' }}
                                        style={styles.avatar}
                                        resizeMode="cover"
                                    />
                                </View>

                                <View style={styles.userDetails}>
                                    <Text style={styles.userName}>{item.fullName || item.username}</Text>
                                    <Text style={styles.userUsername}>@{item.username}</Text>
                                    <Text style={styles.userPhone}>{item.phone || 'Chưa cập nhật SĐT'}</Text>
                                    <View style={[styles.roleBadge, getRoleBadgeStyle(item.role)]}>
                                        <Text style={styles.roleText}>{item.role}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            <View style={styles.userActions}>
                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => handleUserPress(item)}
                                >
                                    <Text style={styles.editButtonText}>Sửa</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => confirmDeleteUser(item)}
                                >
                                    <Text style={styles.deleteButtonText}>Xóa</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            {loading ? 'Đang tải...' : 'Không tìm thấy người dùng nào'}
                        </Text>
                    }
                />
            </View>

            {/* Role Selection Modal */}
            <Modal
                visible={showRoleModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowRoleModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn vai trò</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowRoleModal(false)}
                            >
                                <Text style={styles.closeButtonText}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.roleList}>
                            {roles.map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.roleItem,
                                        selectedRole === role && styles.selectedRoleItem
                                    ]}
                                    onPress={() => handleRoleSelect(role)}
                                >
                                    <Text style={[
                                        styles.roleItemText,
                                        selectedRole === role && styles.selectedRoleItemText
                                    ]}>
                                        {role}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.deleteModalContent}>
                        <Text style={styles.modalTitle}>Xác nhận xóa</Text>
                        <Text style={styles.modalMessage}>
                            Bạn có chắc chắn muốn xóa người dùng {userToDelete?.fullName || userToDelete?.username} không?
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalButtonCancel}
                                onPress={() => setShowDeleteModal(false)}
                            >
                                <Text style={styles.modalButtonText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButtonDelete}
                                onPress={handleDeleteUser}
                            >
                                <Text style={styles.modalButtonText}>Xóa</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    mainContent: {
        flex: 1,
        padding: 15,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 20,
        paddingHorizontal: 25,
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    addButton: {
        backgroundColor: '#2ecc71',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    filtersContainer: {
        marginBottom: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        padding: 12,
        fontSize: 16,
    },
    clearButton: {
        padding: 12,
    },
    clearButtonText: {
        fontSize: 20,
        color: '#95a5a6',
        fontWeight: 'bold',
    },
    roleFilterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roleButton: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    roleButtonText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    clearRoleButton: {
        marginLeft: 8,
        backgroundColor: '#e74c3c',
        borderRadius: 8,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearRoleButtonText: {
        fontSize: 20,
        color: '#fff',
        fontWeight: 'bold',
    },
    userCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 15,
        padding: 15,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 15,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#f0f0f0',
    },
    userDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 4,
    },
    userUsername: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 4,
    },
    userPhone: {
        fontSize: 14,
        color: '#2c3e50',
        marginBottom: 6,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    adminBadge: {
        backgroundColor: '#e74c3c',
    },
    dealerBadge: {
        backgroundColor: '#3498db',
    },
    customerBadge: {
        backgroundColor: '#2ecc71',
    },
    shipperBadge: {
        backgroundColor: '#f39c12',
    },
    roleText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    userActions: {
        justifyContent: 'center',
        gap: 8,
    },
    editButton: {
        backgroundColor: '#3498db',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    editButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    deleteButton: {
        backgroundColor: '#e74c3c',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#7f8c8d',
        marginTop: 20,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        width: '80%',
        maxHeight: '80%',
        padding: 20,
    },
    deleteModalContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        width: '80%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#e74c3c',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    roleList: {
        maxHeight: 300,
    },
    roleItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedRoleItem: {
        backgroundColor: '#3498db',
    },
    roleItemText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    selectedRoleItemText: {
        color: '#fff',
    },
    modalMessage: {
        fontSize: 16,
        color: '#2c3e50',
        marginBottom: 20,
        lineHeight: 22,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    modalButtonCancel: {
        backgroundColor: '#95a5a6',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 4,
        marginRight: 10,
    },
    modalButtonDelete: {
        backgroundColor: '#e74c3c',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 4,
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
}); 