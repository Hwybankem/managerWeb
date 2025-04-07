import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Modal, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFirestore } from '../../context/storageFirebase';
import * as ImagePicker from 'expo-image-picker';
import { uploadToImgBB } from '../../services/imgbbService';
import formatDate from '../../components/utils/timeParse';
import { Timestamp } from 'firebase/firestore';
import BackButton from '../../components/common/UI/backButton';

interface User {
    id: string;
    username: string;
    fullName: string;
    phone: string;
    role: string;
    avatar: string;
    createdAt?: { seconds: number; nanoseconds: number };
    updatedAt?: { seconds: number; nanoseconds: number };
}

export default function UserDetail() {
    const { id } = useLocalSearchParams();
    const { getDocument, updateDocument, deleteDocument } = useFirestore();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState<Partial<User>>({});
    const [editedAvatar, setEditedAvatar] = useState<string>('');
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const roles = [
        { value: 'admin', label: 'Quản trị viên' },
        { value: 'manager', label: 'Quản lý' },
        { value: 'staff', label: 'Nhân viên' },
    ];

    const loadData = async () => {
        try {
            console.log('Tải dữ liệu cho ID người dùng:', id);
            setLoading(true);
            
            const userData = await getDocument('users', id as string);
            if (userData) {
                setUser(userData as User);
                setEditedAvatar(userData.avatar || '');
                console.log('Tải dữ liệu người dùng thành công');
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
            Alert.alert('Lỗi', 'Không thể tải dữ liệu người dùng. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        if (typeof window !== 'undefined') {
            const pushState = () => {
                const state = { id };
                window.history.pushState(state, '', window.location.href);
            };
            
            pushState();
            
            const handlePopState = () => {
                console.log('Người dùng đã nhấn nút quay lại của trình duyệt');
                loadData();
            };
            
            window.addEventListener('popstate', handlePopState);
            
            return () => {
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, [id]);

    const handleGoBack = () => {
        router.push('/users/user');
    };

    const handleDelete = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            await deleteDocument('users', id as string);
            setShowDeleteModal(false);
            Alert.alert('Thành công', 'Đã xóa người dùng thành công');
            setTimeout(() => {
                router.push('/users/user');
            }, 500);
        } catch (error) {
            console.error('Lỗi khi xóa người dùng:', error);
            Alert.alert('Lỗi', 'Không thể xóa người dùng');
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setEditedUser({
            fullName: user?.fullName,
            phone: user?.phone,
            role: user?.role,
        });
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            try {
                const url = await uploadToImgBB(result.assets[0].uri);
                setEditedAvatar(url);
            } catch (error) {
                console.error('Lỗi khi upload ảnh:', error);
                Alert.alert('Lỗi', 'Không thể upload ảnh đại diện');
            }
        }
    };

    const handleSave = async () => {
        try {
            if (!editedUser.fullName) {
                Alert.alert('Lỗi', 'Vui lòng điền đầy đủ họ tên');
                return;
            }

            const updatedData = {
                ...editedUser,
                avatar: editedAvatar,
                updatedAt: Timestamp.fromDate(new Date()) // Lưu dưới dạng Firestore Timestamp
            };

            await updateDocument('users', id as string, updatedData);
            setUser(prev => prev ? { ...prev, ...updatedData } : null);
            setIsEditing(false);
            Alert.alert('Thành công', 'Đã cập nhật thông tin người dùng thành công');
        } catch (error) {
            console.error('Lỗi khi cập nhật thông tin người dùng:', error);
            Alert.alert('Lỗi', 'Không thể cập nhật thông tin người dùng');
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedUser({});
        setEditedAvatar(user?.avatar || '');
    };

    const handleRoleSelect = (role: string) => {
        setEditedUser(prev => ({ ...prev, role }));
        setShowRoleModal(false);
    };



    if (loading) return <View style={styles.container}><Text style={styles.loadingText}>Đang tải...</Text></View>;

    if (!user) return <View style={styles.container}><Text style={styles.errorText}>Không tìm thấy người dùng</Text></View>;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <BackButton path={'/users/user'} />
                <Text style={styles.headerTitle}>Chi tiết người dùng</Text>
                {!isEditing ? (
                    <>
                        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                            <Text style={styles.editButtonText}>Chỉnh sửa</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                            <Text style={styles.deleteButtonText}>Xóa</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.editActions}>
                        <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={handleCancel}>
                            <Text style={styles.actionButtonText}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSave}>
                            <Text style={styles.actionButtonText}>Lưu</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                    <View style={styles.avatarSection}>
                        {isEditing ? (
                            <TouchableOpacity onPress={pickImage}>
                                <Image
                                    source={{ uri: editedAvatar || 'https://via.placeholder.com/150?text=User' }}
                                    style={styles.avatar}
                                />
                                <View style={styles.editAvatarButton}>
                                    <Text style={styles.editAvatarButtonText}>Sửa ảnh</Text>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <Image
                                source={{ uri: user.avatar || 'https://via.placeholder.com/150?text=User' }}
                                style={styles.avatar}
                            />
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Tên đăng nhập:</Text>
                        <Text style={styles.infoValue}>{user.username}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Họ tên:</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={editedUser.fullName}
                                onChangeText={(text) => setEditedUser(prev => ({ ...prev, fullName: text }))}
                                placeholder="Nhập họ tên"
                            />
                        ) : (
                            <Text style={styles.infoValue}>{user.fullName}</Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Số điện thoại:</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={editedUser.phone}
                                onChangeText={(text) => setEditedUser(prev => ({ ...prev, phone: text }))}
                                placeholder="Nhập số điện thoại"
                                keyboardType="phone-pad"
                            />
                        ) : (
                            <Text style={styles.infoValue}>{user.phone || 'Chưa cập nhật'}</Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Vai trò:</Text>
                        {isEditing ? (
                            <TouchableOpacity
                                style={styles.roleSelectButton}
                                onPress={() => setShowRoleModal(true)}
                            >
                                <Text style={styles.roleSelectButtonText}>
                                    {roles.find(r => r.value === editedUser.role)?.label || 'Chọn vai trò'}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.roleBadgeContainer}>
                                <Text style={[
                                    styles.roleBadge, 
                                    user.role === 'admin' ? styles.roleBadge_admin : 
                                    user.role === 'manager' ? styles.roleBadge_manager : 
                                    styles.roleBadge_staff
                                ]}>
                                    {roles.find(r => r.value === user.role)?.label || user.role}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Thông tin thời gian</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Ngày tạo:</Text>
                        <Text style={styles.infoValue}>{formatDate(user.createdAt)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Cập nhật lần cuối:</Text>
                        <Text style={styles.infoValue}>{formatDate(user.updatedAt)}</Text>
                    </View>
                </View>
            </ScrollView>

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
                            {roles.map((roleItem) => (
                                <TouchableOpacity
                                    key={roleItem.value}
                                    style={[
                                        styles.roleItem,
                                        editedUser.role === roleItem.value && styles.selectedRoleItem
                                    ]}
                                    onPress={() => handleRoleSelect(roleItem.value)}
                                >
                                    <Text style={[
                                        styles.roleItemText,
                                        editedUser.role === roleItem.value && styles.selectedRoleItemText
                                    ]}>
                                        {roleItem.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

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
                            Bạn có chắc chắn muốn xóa người dùng {user.fullName || user.username} không?
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
                                onPress={confirmDelete}
                            >
                                <Text style={styles.modalButtonText}>Xóa</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    loadingText: {
        fontSize: 18,
        color: '#3498db',
        textAlign: 'center',
        marginTop: 50,
    },
    errorText: {
        fontSize: 18,
        color: '#e74c3c',
        textAlign: 'center',
        marginTop: 50,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e4e7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a2b49',
        flex: 1,
    },
    editActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    editButton: {
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        shadowColor: '#007bff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    editButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: '#e63946',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        shadowColor: '#e63946',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: '#a0aec0',
        shadowColor: '#a0aec0',
    },
    saveButton: {
        backgroundColor: '#28a745',
        shadowColor: '#28a745',
    },
    content: {
        flex: 1,
        padding: 15,
    },
    section: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginBottom: 15,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a2b49',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e4e7',
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 123, 255, 0.8)',
        paddingVertical: 8,
        alignItems: 'center',
        borderBottomLeftRadius: 60,
        borderBottomRightRadius: 60,
    },
    editAvatarButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    infoLabel: {
        width: '30%',
        fontSize: 16,
        fontWeight: '600',
        color: '#1a2b49',
    },
    infoValue: {
        flex: 1,
        fontSize: 16,
        color: '#4a5568',
    },
    editInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        backgroundColor: '#f9fafb',
    },
    roleBadgeContainer: {
        flex: 1,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    roleBadge_admin: {
        backgroundColor: '#e74c3c',
    },
    roleBadge_manager: {
        backgroundColor: '#3498db',
    },
    roleBadge_staff: {
        backgroundColor: '#2ecc71',
    },
    roleSelectButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#f9fafb',
    },
    roleSelectButtonText: {
        fontSize: 16,
        color: '#1a2b49',
        fontWeight: '500',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 15,
        width: '90%',
        maxWidth: 500,
        maxHeight: '80%',
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    deleteModalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 15,
        width: '90%',
        maxWidth: 500,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e4e7',
        paddingBottom: 15,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a2b49',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e63946',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    roleList: {
        maxHeight: 300,
    },
    roleItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e4e7',
        borderRadius: 8,
        marginBottom: 5,
    },
    selectedRoleItem: {
        backgroundColor: '#007bff',
    },
    roleItemText: {
        fontSize: 16,
        color: '#1a2b49',
        fontWeight: '500',
    },
    selectedRoleItemText: {
        color: '#fff',
    },
    modalMessage: {
        fontSize: 16,
        color: '#4a5568',
        marginBottom: 20,
        lineHeight: 24,
        textAlign: 'center',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButtonCancel: {
        backgroundColor: '#a0aec0',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
        shadowColor: '#a0aec0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    modalButtonDelete: {
        backgroundColor: '#e63946',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
        shadowColor: '#e63946',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});