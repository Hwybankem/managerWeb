import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Modal,
    Alert,
    Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFirestore } from '../../context/storageFirebase';
import { useAuth } from '../../context/AuthContext';
import { uploadToImgBB } from '../../services/imgbbService';
import { router } from 'expo-router';

export default function AddUser() {
    const { addDocument } = useFirestore();
    const { register } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<'admin' | 'customer' | 'dealer' | 'shipper'>('dealer')
    const [avatar, setAvatar] = useState<string>('');
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const roles = [
        { value: 'admin', label: 'Quản trị viên' },
        { value: 'customer', label: 'Khách hàng' },
        { value: 'shipper', label: 'Nhân viên vận chuyển' },
        { value: 'dealer', label: 'Đại lý' },
    ];

    // Thêm hàm kiểm tra email hợp lệ
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Thêm hàm kiểm tra độ mạnh mật khẩu
    const isValidPassword = (password: string): boolean => {
        return password.length >= 6; // Firebase Auth yêu cầu mật khẩu ít nhất 6 ký tự
    };

    const handleSubmit = async () => {
        if (!username || !password || !fullName) {
            setErrorMessage('Vui lòng điền đầy đủ thông tin bắt buộc (email, mật khẩu, họ tên)');
            setShowErrorModal(true);
            return;
        }
        
        if (!isValidEmail(username)) {
            setErrorMessage('Tên đăng nhập phải là địa chỉ email hợp lệ');
            setShowErrorModal(true);
            return;
        }

        if (!isValidPassword(password)) {
            setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự');
            setShowErrorModal(true);
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('Mật khẩu xác nhận không khớp');
            setShowErrorModal(true);
            return;
        }
    
        try {
            setIsSubmitting(true);
            
            // Upload avatar lên ImgBB nếu có
            let avatarUrl = avatar;
            if (avatar) {
                try {
                    avatarUrl = await uploadToImgBB(avatar);
                } catch (error) {
                    console.error('Lỗi khi upload avatar:', error);
                    setErrorMessage('Không thể upload ảnh đại diện. Vui lòng thử lại sau.');
                    setShowErrorModal(true);
                    return;
                }
            }
    
            // Sử dụng hàm register từ AuthContext để đăng ký và xác thực người dùng
            await register(
                username,  // Sử dụng username làm email 
                password,
                fullName,
                phone,
                role,
                avatarUrl,
            );
            
            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
                router.push('/users/user');
            }, 2000);
        } catch (err: any) {
            console.error('Lỗi khi thêm người dùng:', err);
            setErrorMessage(err.message || 'Không thể lưu thông tin người dùng');
            setShowErrorModal(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRoleSelect = (selectedRole: 'admin' | 'customer' | 'dealer' | 'shipper') => {
        setRole(selectedRole);
        setShowRoleModal(false);
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setAvatar(result.assets[0].uri);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.push('/users/user')}
                >
                    <Text style={styles.backButtonText}>← Quay lại</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thêm người dùng mới</Text>
            </View>

            <View style={styles.formContainer}>
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
                    
                    <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Nhập địa chỉ email"
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <Text style={styles.label}>Mật khẩu <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Nhập mật khẩu"
                        secureTextEntry
                    />

                    <Text style={styles.label}>Xác nhận mật khẩu <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Nhập lại mật khẩu"
                        secureTextEntry
                    />
                </View>

                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
                    
                    <Text style={styles.label}>Họ tên <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Nhập họ tên đầy đủ"
                    />

                    <Text style={styles.label}>Số điện thoại</Text>
                    <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Nhập số điện thoại"
                        keyboardType="phone-pad"
                    />
                </View>

                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Vai trò</Text>
                    <TouchableOpacity
                        style={styles.roleButton}
                        onPress={() => setShowRoleModal(true)}
                    >
                        <Text style={styles.roleButtonText}>
                            {roles.find(r => r.value === role)?.label || 'Chọn vai trò'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Ảnh đại diện</Text>
                    <View style={styles.avatarContainer}>
                        {avatar ? (
                            <Image 
                                source={{ uri: avatar }} 
                                style={styles.avatar} 
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.placeholderAvatar}>
                                <Text style={styles.placeholderText}>Chưa có ảnh</Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                            <Text style={styles.uploadButtonText}>{avatar ? 'Thay đổi ảnh' : 'Tải lên ảnh'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    <Text style={styles.submitButtonText}>
                        {isSubmitting ? 'Đang xử lý...' : 'Thêm người dùng'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Modal chọn vai trò */}
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
                                        role === roleItem.value && styles.selectedRoleItem
                                    ]}
                                    onPress={() => handleRoleSelect(roleItem.value as 'admin' | 'customer' | 'dealer' | 'shipper')}
                                >
                                    <Text style={[
                                        styles.roleItemText,
                                        role === roleItem.value && styles.selectedRoleItemText
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
                visible={showSuccessModal}
                transparent
                animationType="fade"
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, styles.successModal]}>
                        <Text style={styles.successText}>Thêm người dùng thành công!</Text>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showErrorModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowErrorModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, styles.errorModal]}>
                        <Text style={styles.errorText}>{errorMessage}</Text>
                        <TouchableOpacity
                            style={styles.errorButton}
                            onPress={() => setShowErrorModal(false)}
                        >
                            <Text style={styles.errorButtonText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa', // Màu nền nhẹ nhàng hơn
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e4e7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 5,
    },
    backButton: {
        marginRight: 15,
        padding: 10,
        borderRadius: 10,
        backgroundColor: '#e6f0fa',
    },
    backButtonText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a2b49', // Màu chữ đậm hơn
        flex: 1,
        textAlign: 'center',
    },
    formContainer: {
        padding: 15,
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
    },
    formSection: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a2b49',
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a2b49',
        marginBottom: 8,
    },
    required: {
        color: '#e63946',
        fontWeight: 'bold',
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9fafb',
        marginBottom: 15,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 15,
    },
    avatar: {
        width: 150,
        height: 150,
        borderRadius: 75,
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#e0e4e7',
    },
    placeholderAvatar: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#e6f0fa',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#e0e4e7',
    },
    placeholderText: {
        color: '#a0aec0',
        fontSize: 16,
        fontWeight: '500',
    },
    uploadButton: {
        backgroundColor: '#007bff',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
        shadowColor: '#007bff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    roleButton: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        padding: 12,
        backgroundColor: '#f9fafb',
        marginBottom: 15,
    },
    roleButtonText: {
        fontSize: 16,
        color: '#1a2b49',
        fontWeight: '500',
    },
    submitButton: {
        backgroundColor: '#28a745',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#28a745',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    disabledButton: {
        backgroundColor: '#a0aec0',
        shadowColor: '#a0aec0',
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
        maxWidth: 600,
        maxHeight: '80%',
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
    successModal: {
        padding: 25,
        backgroundColor: '#28a745',
        borderRadius: 15,
        alignItems: 'center',
    },
    successText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    errorModal: {
        padding: 25,
        backgroundColor: '#ffffff',
        borderRadius: 15,
        alignItems: 'center',
    },
    errorText: {
        color: '#e63946',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 20,
        textAlign: 'center',
    },
    errorButton: {
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
    errorButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});