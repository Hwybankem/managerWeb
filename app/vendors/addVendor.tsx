import React, { useState, useEffect } from 'react';
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
    FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFirestore } from '../../context/storageFirebase';
import { uploadToImgBB } from '../../services/imgbbService';
import { router, useLocalSearchParams } from 'expo-router';
import removeAccents from '@/components/utils/stringUtils';

// Các interface và danh sách tỉnh thành không thay đổi
interface AuthorizedUser {
    userId: string;
    username: string;
    fullName: string;
}

interface Vendor {
    id?: string;
    name: string;
    description: string;
    address: string;
    province: string;
    phone: string;
    logo: string;
    hasOrders?: boolean;
    authorizedUsers?: AuthorizedUser[];
    createdAt?: Date;
    updatedAt?: Date;
}

interface User {
    id: string;
    username: string;
    fullName: string;
    phone: string;
    role: string;
    avatar: string;
}

const vietnamProvinces = [
    "Hà Nội", "TP Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
    "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
    "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
    "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk", "Đắk Nông",
    "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang",
    "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình",
    "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu",
    "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định",
    "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên",
    "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị",
    "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên",
    "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang",
    "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
];

export default function AddVendor() {
    const { addDocument, getDocuments } = useFirestore();
    const params = useLocalSearchParams();
    const isEdit = params.id ? true : false;
    
    const [vendorName, setVendorName] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [province, setProvince] = useState('');
    const [phone, setPhone] = useState('');
    const [logo, setLogo] = useState<string>('');
    const [showProvinceModal, setShowProvinceModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [filteredProvinces, setFilteredProvinces] = useState<string[]>(vietnamProvinces);
    const [provinceSearchQuery, setProvinceSearchQuery] = useState('');
    
    const [showAuthorizeModal, setShowAuthorizeModal] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);

    useEffect(() => {
        if (provinceSearchQuery.trim() === '') {
            setFilteredProvinces(vietnamProvinces);
        } else {
            const query = provinceSearchQuery.toLowerCase();
            const filtered = vietnamProvinces.filter(province => 
                province.toLowerCase().includes(query)
            );
            setFilteredProvinces(filtered);
        }
    }, [provinceSearchQuery]);
    
    useEffect(() => {
        if (userSearchQuery.trim() === '') {
            setFilteredUsers(availableUsers);
        } else {
            const query = removeAccents(userSearchQuery.toLowerCase());
            const filtered = availableUsers.filter(user => 
                removeAccents((user.fullName || user.username).toLowerCase()).includes(query) ||
                user.role.toLowerCase().includes(query)
            );
            setFilteredUsers(filtered);
        }
    }, [userSearchQuery, availableUsers]);

    const loadUsers = async () => {
        try {
            const usersData = await getDocuments('users');
            let filteredUsers = usersData.filter((user: any) => 
                user.role === 'dealer'
            );

            console.log('Danh sách người dùng:', filteredUsers);
            const currentAuthorizedUserIds = authorizedUsers.map(u => u.userId);
            filteredUsers = filteredUsers.filter((user: any) => 
                !currentAuthorizedUserIds.includes(user.id)
            );
            const formattedUsers: User[] = filteredUsers.map((user: any) => ({
                id: user.id,
                username: user.username,
                fullName: user.fullName || '',
                phone: user.phone || '',
                role: user.role || '',
                avatar: user.avatar || ''
            }));
            setAvailableUsers(formattedUsers);
            setFilteredUsers(formattedUsers);
        } catch (error) {
            console.error('Lỗi khi tải danh sách người dùng:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách người dùng');
        }
    };
    
    const handleOpenAuthorizeModal = () => {
        loadUsers();
        setShowAuthorizeModal(true);
    };
    
    const handleAuthorizeUser = (user: User) => {
        const newAuthorizedUser: AuthorizedUser = {
            userId: user.id,
            username: user.username,
            fullName: user.fullName
        };
        setAuthorizedUsers(prev => [...prev, newAuthorizedUser]);
        setAvailableUsers(prev => prev.filter(u => u.id !== user.id));
    };
    
    const handleRemoveAuthorizedUser = (userId: string) => {
        setAuthorizedUsers(prev => prev.filter(u => u.userId !== userId));
        loadUsers();
    };

    const handleSubmit = async () => {
        if (!vendorName || !address || !phone || !province) {
            setErrorMessage('Vui lòng điền đầy đủ thông tin (tên, địa chỉ, điện thoại, tỉnh thành)');
            setShowErrorModal(true);
            return;
        }
    
        try {
            setIsSubmitting(true);
            let logoUrl = logo;
            if (logo) {
                try {
                    logoUrl = await uploadToImgBB(logo);
                } catch (error) {
                    console.error('Lỗi khi upload logo:', error);
                    setErrorMessage('Không thể upload logo. Vui lòng thử lại sau.');
                    setShowErrorModal(true);
                    return;
                }
            }
    
            const vendorData: Vendor = {
                name: vendorName,
                description: description,
                address: address,
                province: province,
                phone: phone,
                logo: logoUrl,
                hasOrders: false,
                authorizedUsers: authorizedUsers.length > 0 ? authorizedUsers : undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
    
            await addDocument('vendors', vendorData, vendorName);
            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
                router.push('/vendors/vendor');
            }, 2000);
        } catch (err) {
            console.error('Lỗi khi thêm đại lý:', err);
            setErrorMessage(err instanceof Error ? err.message : 'Không thể lưu đại lý');
            setShowErrorModal(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleProvinceSelect = (selectedProvince: string) => {
        setProvince(selectedProvince);
        setShowProvinceModal(false);
        setProvinceSearchQuery('');
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setLogo(result.assets[0].uri);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.push('/vendors/vendor')}
                >
                    <Text style={styles.backButtonText}>← Quay lại</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEdit ? 'Chỉnh sửa đại lý' : 'Thêm đại lý mới'}</Text>
            </View>

            <View style={styles.formContainer}>
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Thông tin đại lý</Text>
                    
                    <Text style={styles.label}>Tên đại lý <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={vendorName}
                        onChangeText={setVendorName}
                        placeholder="Nhập tên đại lý"
                    />

                    <Text style={styles.label}>Điện thoại <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Nhập số điện thoại"
                        keyboardType="phone-pad"
                    />

                    <Text style={styles.label}>Địa chỉ <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={address}
                        onChangeText={setAddress}
                        placeholder="Nhập địa chỉ đại lý"
                    />

                    <Text style={styles.label}>Tỉnh/thành phố <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity
                        style={styles.provinceButton}
                        onPress={() => setShowProvinceModal(true)}
                    >
                        <Text style={styles.provinceButtonText}>
                            {province ? province : 'Chọn tỉnh/thành phố'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Mô tả</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Nhập mô tả về đại lý"
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                    />

                    <Text style={styles.label}>Logo</Text>
                    <View style={styles.logoContainer}>
                        {logo ? (
                            <Image 
                                source={{ uri: logo }} 
                                style={styles.logo} 
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.placeholderLogo}>
                                <Text style={styles.placeholderText}>Chưa có logo</Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                            <Text style={styles.uploadButtonText}>{logo ? 'Thay đổi logo' : 'Tải lên logo'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Phần quản lý ủy quyền người dùng */}
                    <Text style={styles.label}>Người dùng được ủy quyền</Text>
                    {isEdit && (
                        <View style={styles.sectionHeader}>
                            <TouchableOpacity
                                style={styles.addUserButton}
                                onPress={() => router.push('/users/addUser')}
                            >
                                <Text style={styles.addUserButtonText}>+ Thêm người dùng</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.addUserButton, { marginLeft: 10 }]}
                                onPress={handleOpenAuthorizeModal}
                            >
                                <Text style={styles.addUserButtonText}>Ủy quyền</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {authorizedUsers.length > 0 ? (
                        <View style={styles.authorizedUsersContainer}>
                            {authorizedUsers.map(user => (
                                <View key={user.userId} style={styles.authorizedUserItem}>
                                    <View style={styles.authorizedUserInfo}>
                                        <Text style={styles.authorizedUserName}>
                                            {user.fullName || user.username}
                                        </Text>
                                        <Text style={styles.authorizedUserUsername}>
                                            @{user.username}
                                        </Text>
                                    </View>
                                    {isEdit && (
                                        <TouchableOpacity
                                            style={styles.removeUserButton}
                                            onPress={() => handleRemoveAuthorizedUser(user.userId)}
                                        >
                                            <Text style={styles.removeUserButtonText}>Hủy</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.emptyText}>Chưa có người dùng nào được ủy quyền</Text>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    <Text style={styles.submitButtonText}>
                        {isSubmitting ? 'Đang xử lý...' : isEdit ? 'Cập nhật đại lý' : 'Thêm đại lý'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Modal chọn tỉnh thành */}
            <Modal
                visible={showProvinceModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowProvinceModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn tỉnh/thành phố</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => {
                                    setShowProvinceModal(false);
                                    setProvinceSearchQuery('');
                                }}
                            >
                                <Text style={styles.closeButtonText}>×</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.provinceSearchContainer}>
                            <TextInput
                                style={styles.provinceSearchInput}
                                placeholder="Tìm kiếm tỉnh/thành phố..."
                                value={provinceSearchQuery}
                                onChangeText={setProvinceSearchQuery}
                            />
                        </View>
                        
                        <ScrollView style={styles.provinceList}>
                            {filteredProvinces.map((provinceItem) => (
                                <TouchableOpacity
                                    key={provinceItem}
                                    style={[
                                        styles.provinceItem,
                                        province === provinceItem && styles.selectedProvinceItem
                                    ]}
                                    onPress={() => handleProvinceSelect(provinceItem)}
                                >
                                    <Text style={[
                                        styles.provinceItemText,
                                        province === provinceItem && styles.selectedProvinceItemText
                                    ]}>
                                        {provinceItem}
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
                        <Text style={styles.successText}>
                            {isEdit ? 'Cập nhật đại lý thành công!' : 'Thêm đại lý thành công!'}
                        </Text>
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
            
            {/* Modal chọn người dùng ủy quyền */}
            <Modal
                visible={showAuthorizeModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAuthorizeModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Ủy quyền người dùng</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => {
                                    setShowAuthorizeModal(false);
                                    setUserSearchQuery('');
                                }}
                            >
                                <Text style={styles.closeButtonText}>×</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <TextInput
                            style={styles.userSearchInput}
                            placeholder="Tìm kiếm người dùng..."
                            value={userSearchQuery}
                            onChangeText={setUserSearchQuery}
                        />
                        
                        <ScrollView style={styles.usersList}>
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <TouchableOpacity
                                        key={user.id}
                                        style={styles.userItem}
                                        onPress={() => handleAuthorizeUser(user)}
                                    >
                                        <View style={styles.userItemLeft}>
                                            <Image
                                                source={{ uri: user.avatar || 'https://via.placeholder.com/50?text=User' }}
                                                style={styles.userAvatar}
                                            />
                                            <View style={styles.userInfo}>
                                                <Text style={styles.userName}>
                                                    {user.fullName || user.username}
                                                </Text>
                                                <Text style={styles.userRole}>{user.role}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.authorizeButton}
                                            onPress={() => handleAuthorizeUser(user)}
                                        >
                                            <Text style={styles.authorizeButtonText}>Ủy quyền</Text>
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={styles.emptyUserText}>
                                    {userSearchQuery ? 'Không tìm thấy người dùng phù hợp' : 'Không có người dùng khả dụng'}
                                </Text>
                            )}
                        </ScrollView>
                        
                        <View style={styles.createUserNote}>
                            <Text style={styles.createUserText}>
                                Nếu không tìm thấy người dùng phù hợp, bạn có thể
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowAuthorizeModal(false);
                                    router.push('/users/addUser');
                                }}
                            >
                                <Text style={styles.createUserLink}>tạo người dùng mới</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

// Styles không thay đổi
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    backButton: {
        marginRight: 15,
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    backButtonText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '500',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    formContainer: {
        padding: 20,
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
    },
    formSection: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2c3e50',
        marginBottom: 8,
        marginTop: 15,
    },
    required: {
        color: '#e74c3c',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        marginBottom: 15,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 15,
    },
    logo: {
        width: 150,
        height: 150,
        borderRadius: 75,
        marginBottom: 15,
    },
    placeholderLogo: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    placeholderText: {
        color: '#95a5a6',
        fontSize: 16,
    },
    uploadButton: {
        backgroundColor: '#3498db',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    provinceButton: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
        marginBottom: 15,
    },
    provinceButtonText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    submitButton: {
        backgroundColor: '#2ecc71',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    disabledButton: {
        backgroundColor: '#95a5a6',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 15,
        width: '90%',
        maxWidth: 500,
        maxHeight: '85%',
        padding: 25,
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
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 15,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e74c3c',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    provinceSearchContainer: {
        marginBottom: 15,
    },
    provinceSearchInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    provinceList: {
        maxHeight: 400,
    },
    provinceItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedProvinceItem: {
        backgroundColor: '#3498db',
    },
    provinceItemText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    selectedProvinceItemText: {
        color: '#fff',
    },
    successModal: {
        padding: 20,
        backgroundColor: '#2ecc71',
    },
    successText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    errorModal: {
        padding: 20,
        backgroundColor: '#fff',
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 16,
        marginBottom: 15,
        textAlign: 'center',
    },
    errorButton: {
        backgroundColor: '#e74c3c',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    errorButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 15,
    },
    addUserButton: {
        backgroundColor: '#3498db',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    addUserButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    authorizedUsersContainer: {
        marginTop: 10,
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        padding: 10,
    },
    authorizedUserItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    authorizedUserInfo: {
        flex: 1,
    },
    authorizedUserName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 3,
    },
    authorizedUserUsername: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    removeUserButton: {
        backgroundColor: '#e74c3c',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    removeUserButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    userSearchInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: '#f8f9fa',
    },
    usersList: {
        maxHeight: 350,
    },
    userItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    userItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userAvatar: {
        width: 45,
        height: 45,
        borderRadius: 23,
        marginRight: 15,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 3,
    },
    userRole: {
        fontSize: 14,
        color: '#7f8c8d',
        backgroundColor: '#f0f0f0',
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    authorizeButton: {
        backgroundColor: '#3498db',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    authorizeButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyUserText: {
        textAlign: 'center',
        marginTop: 30,
        marginBottom: 30,
        color: '#7f8c8d',
        fontSize: 16,
    },
    createUserNote: {
        marginTop: 25,
        padding: 18,
        backgroundColor: '#f1f9ff',
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d6eaf8',
    },
    createUserText: {
        fontSize: 15,
        color: '#2c3e50',
        textAlign: 'center',
    },
    createUserLink: {
        fontSize: 15,
        color: '#3498db',
        fontWeight: '600',
        marginTop: 8,
        textDecorationLine: 'underline',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 10,
        color: '#95a5a6',
        fontStyle: 'italic',
        fontSize: 15,
    },
});