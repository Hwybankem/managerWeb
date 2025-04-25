import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Modal, FlatList, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFirestore } from '../../context/storageFirebase';
import { ImageManager } from '../../components/common/UI/ImageManager';
import * as ImagePicker from 'expo-image-picker';
import { uploadToImgBB } from '../../services/imgbbService';
import removeAccents from '@/components/utils/stringUtils';

interface AuthorizedUser {
    userId: string;
    username: string;
    fullName: string;
}

interface Vendor {
    id: string;
    name: string;
    description: string;
    address: string;
    province: string;
    phone: string;
    logo: string;
    hasOrders?: boolean;
    authorizedUsers?: AuthorizedUser[];
    createdAt: Date;
    updatedAt: Date;
}

interface OrderRequest {
    id: string;
    productName: string;
    productId: string;
    quantity: number;
    requestDate: Date;
    status: 'pending' | 'approved' | 'rejected';
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

interface User {
    id: string;
    username: string;
    fullName: string;
    phone: string;
    role: string;
    avatar: string;
    status: string;
}

export default function VendorDetail() {
    const { id } = useLocalSearchParams();
    const { getDocument, updateDocument, deleteDocument, getDocuments, addDocument, queryDocuments } = useFirestore();
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedVendor, setEditedVendor] = useState<Partial<Vendor>>({});
    const [editedLogo, setEditedLogo] = useState<string>('');
    const [showProvinceModal, setShowProvinceModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showAutoRejectModal, setShowAutoRejectModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [filteredProvinces, setFilteredProvinces] = useState<string[]>(vietnamProvinces);
    const [provinceSearchQuery, setProvinceSearchQuery] = useState('');
    const [orderRequests, setOrderRequests] = useState<OrderRequest[]>([]);
    const [showAuthorizeModal, setShowAuthorizeModal] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
    const [showStockWarningModal, setShowStockWarningModal] = useState(false); // State điều khiển modal cảnh báo tồn kho
    const [stockWarningMessage, setStockWarningMessage] = useState(''); // State chứa thông báo lỗi tồn kho

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
                removeAccents((user.fullName || user.username).toLowerCase()).includes(query)
            );
            setFilteredUsers(filtered);
        }
    }, [userSearchQuery, availableUsers]);

    const loadData = async () => {
        try {
            console.log('Tải dữ liệu cho ID đại lý:', id);
            setLoading(true);

            const vendorData = await getDocument('vendors', id as string);
            if (vendorData) {
                setVendor(vendorData as Vendor);
                setEditedLogo(vendorData.logo || '');
                setAuthorizedUsers(vendorData.authorizedUsers || []);
                console.log('Tải dữ liệu đại lý thành công');

                // Lấy danh sách yêu cầu nhập hàng của đại lý
                console.log('Đang tải danh sách yêu cầu nhập hàng...');
                const ordersData = await queryDocuments('importRequests', 'vendorId', '==', id);
                console.log('Số lượng yêu cầu nhập hàng:', ordersData.length);

                const formattedOrders: OrderRequest[] = ordersData.map((order: any) => ({
                    id: order.id,
                    productName: order.productName,
                    productId: order.productId,
                    quantity: order.quantity,
                    requestDate: order.requestDate?.toDate() || new Date(),
                    status: order.status || 'pending'
                }));

                setOrderRequests(formattedOrders);
                console.log('Đã tải xong danh sách yêu cầu nhập hàng');
            } else {
                console.error('Không tìm thấy đại lý với ID:', id);
                Alert.alert('Lỗi', 'Không tìm thấy thông tin đại lý');
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
            Alert.alert('Lỗi', 'Không thể tải dữ liệu đại lý. Vui lòng thử lại sau.');
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
        router.push('/vendors/vendor');
    };

    const handleDelete = () => {
        setShowDeleteModal(true);
    };

    const handleEdit = () => {
        setIsEditing(true);
        setEditedVendor({
            name: vendor?.name,
            description: vendor?.description,
            address: vendor?.address,
            province: vendor?.province,
            phone: vendor?.phone,
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
            const url = await uploadToImgBB(result.assets[0].uri);
            setEditedLogo(url);
        }
    };

    const handleSave = async () => {
        try {
            if (!editedVendor.name || !editedVendor.address || !editedVendor.phone || !editedVendor.province) {
                Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc (tên, địa chỉ, điện thoại, tỉnh thành)');
                return;
            }

            const updatedData = {
                ...editedVendor,
                logo: editedLogo,
                authorizedUsers: authorizedUsers,
                updatedAt: new Date()
            };

            await updateDocument('vendors', id as string, updatedData);
            setVendor(prev => prev ? { ...prev, ...updatedData } : null);
            setIsEditing(false);
            Alert.alert('Thành công', 'Đã cập nhật đại lý thành công');
        } catch (error) {
            console.error('Lỗi khi cập nhật đại lý:', error);
            Alert.alert('Lỗi', 'Không thể cập nhật đại lý');
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedVendor({});
        setEditedLogo(vendor?.logo || '');
        setAuthorizedUsers(vendor?.authorizedUsers || []); // Khôi phục danh sách người dùng được ủy quyền
    };

    const handleProvinceSelect = (province: string) => {
        setEditedVendor(prev => ({ ...prev, province }));
        setShowProvinceModal(false);
        setProvinceSearchQuery('');
    };

    const handleUpdateOrderStatus = async (orderId: string, newStatus: 'approved' | 'rejected') => {
        try {
            const orderToUpdate = orderRequests.find(order => order.id === orderId);
            if (!orderToUpdate) {
                Alert.alert('Lỗi', 'Không tìm thấy yêu cầu nhập hàng.');
                return;
            }

            if (newStatus === 'approved') {
                console.log(`Đang kiểm tra kho cho sản phẩm: ${orderToUpdate.productId}, số lượng yêu cầu: ${orderToUpdate.quantity}`);
                const productDoc = await getDocument('products', orderToUpdate.productId);

                if (!productDoc) {
                    console.error(`Không tìm thấy sản phẩm với ID: ${orderToUpdate.productId}`);
                    Alert.alert('Lỗi', `Không tìm thấy thông tin sản phẩm "${orderToUpdate.productName}". Không thể duyệt yêu cầu.`);
                    return;
                }

                const currentStock = productDoc.stock || 0;
                console.log(`Tồn kho hiện tại của sản phẩm ${orderToUpdate.productId}: ${currentStock}`);

                if (currentStock < orderToUpdate.quantity) {
                    console.warn(`Tồn kho không đủ. Yêu cầu: ${orderToUpdate.quantity}, Hiện có: ${currentStock}`);
                    setStockWarningMessage(`Tồn kho không đủ cho sản phẩm "${orderToUpdate.productName}". Yêu cầu: ${orderToUpdate.quantity}, Hiện có: ${currentStock}. Không thể duyệt yêu cầu.`);
                    setShowStockWarningModal(true); 
                    return; 
                }

                 // Tạo ID cho tài liệu trong vendor_products
                 const vendorProductDocId = `${id}_${orderToUpdate.productId}`;
                 // Kiểm tra xem tài liệu đã tồn tại trong vendor_products chưa
                 const vendorProductDocRef = await getDocument('vendor_products', vendorProductDocId);

                 if (vendorProductDocRef) {
                     // Nếu đã có, cộng thêm số lượng vào stock
                     const currentVendorStock = vendorProductDocRef.stock || 0;
                     await updateDocument('vendor_products', vendorProductDocId, {
                         stock: currentVendorStock + orderToUpdate.quantity,
                         updatedAt: new Date()
                     });
                     console.log(`Đã cập nhật stock cho vendor_product: ${vendorProductDocId}`);
                 } else {
                     // Nếu chưa có, tạo mới tài liệu
                     await addDocument('vendor_products', {
                         id: id, // ID của vendor
                         products: orderToUpdate.productId, // ID của product
                         stock: orderToUpdate.quantity,
                         createdAt: new Date(),
                         updatedAt: new Date()
                     }, vendorProductDocId); // Sử dụng ID tùy chỉnh
                     console.log(`Đã tạo mới vendor_product: ${vendorProductDocId}`);
                 }

                 // Cập nhật số lượng tồn kho của sản phẩm trong collection products (trừ đi số lượng đã duyệt)
                 await updateDocument('products', orderToUpdate.productId, {
                     stock: currentStock - orderToUpdate.quantity, // Sử dụng currentStock đã lấy trước đó
                     updatedAt: new Date()
                 });
                 console.log(`Đã cập nhật stock cho product: ${orderToUpdate.productId}`);

            } // Kết thúc khối if (newStatus === 'approved')

            // --- Logic cập nhật trạng thái yêu cầu (luôn chạy cho cả approved và rejected) ---
            await updateDocument('importRequests', orderId, {
                status: newStatus,
                updatedAt: new Date()
            });
            console.log(`Đã cập nhật trạng thái yêu cầu ${orderId} thành ${newStatus}`);

            // Cập nhật lại danh sách yêu cầu trên giao diện
            const updatedOrders = orderRequests.map(order =>
                order.id === orderId ? { ...order, status: newStatus } : order
            );

            // Kiểm tra xem còn yêu cầu nào đang chờ không để cập nhật cờ hasOrders
            const hasPendingOrders = updatedOrders.some(order => order.status === 'pending');
            if (vendor && vendor.hasOrders !== hasPendingOrders) { // Chỉ cập nhật nếu trạng thái thay đổi
                await updateDocument('vendors', id as string, {
                    hasOrders: hasPendingOrders,
                    updatedAt: new Date()
                });
                setVendor(prev => prev ? { ...prev, hasOrders: hasPendingOrders } : null);
                console.log(`Đã cập nhật trạng thái hasOrders của vendor ${id} thành ${hasPendingOrders}`);
            }

            setOrderRequests(updatedOrders);
            setSuccessMessage(newStatus === 'approved' ? 'Đã duyệt yêu cầu thành công' : 'Đã từ chối yêu cầu');
            setShowSuccessModal(true);

        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái yêu cầu:', error);
            Alert.alert('Lỗi', 'Không thể cập nhật trạng thái yêu cầu. Vui lòng thử lại.');
        }
    };
    const loadUsers = async () => {
        try {
            const usersData = await getDocuments('users');

            let filteredUsers = usersData.filter((user: any) =>
                user.role === 'dealer'
            );

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
                avatar: user.avatar || '',
                status: user.status || ''
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

    const handleAuthorizeUser = async (user: User) => {
        try {
            const newAuthorizedUser: AuthorizedUser = {
                userId: user.id,
                username: user.username,
                fullName: user.fullName
            };

            const updatedAuthorizedUsers = [...authorizedUsers, newAuthorizedUser];

            setAuthorizedUsers(updatedAuthorizedUsers);
            setAvailableUsers(prev => prev.filter(u => u.id !== user.id));

            Alert.alert('Thành công', `Đã ủy quyền cho người dùng ${user.fullName || user.username}`);
        } catch (error) {
            console.error('Lỗi khi ủy quyền người dùng:', error);
            Alert.alert('Lỗi', 'Không thể ủy quyền cho người dùng này');
        }
    };

    const handleRemoveAuthorizedUser = async (userId: string) => {
        try {
            const updatedAuthorizedUsers = authorizedUsers.filter(u => u.userId !== userId);
            setAuthorizedUsers(updatedAuthorizedUsers);

            Alert.alert('Thành công', 'Đã hủy ủy quyền cho người dùng');
            loadUsers();
        } catch (error) {
            console.error('Lỗi khi hủy ủy quyền người dùng:', error);
            Alert.alert('Lỗi', 'Không thể hủy ủy quyền người dùng này');
        }
    };

    // Thêm hàm format ngày tháng
    const formatDate = (date: Date | undefined): string => {
        if (!date) return 'Không xác định';
        return new Date(date).toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) return <View style={styles.container}><Text>Đang tải...</Text></View>;

    if (!vendor) return <View style={styles.container}><Text>Không tìm thấy đại lý</Text></View>;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                    <Text style={styles.backButtonText}>← Quay lại</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết đại lý</Text>
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

            <View style={styles.mainContent}>
                <View style={styles.imageSection}>
                    {isEditing ? (
                        <>
                            <ImageManager
                                images={[editedLogo]}
                                onRemoveImage={() => setEditedLogo('')}
                                showRemoveButton={true}
                            />
                            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                                <Text style={styles.uploadButtonText}>Thay đổi logo</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <ImageManager
                            images={[vendor.logo]}
                            showRemoveButton={false}
                        />
                    )}
                </View>

                <View style={styles.infoSection}>
                    {isEditing ? (
                        <TextInput
                            style={styles.editInput}
                            value={editedVendor.name}
                            onChangeText={(text) => setEditedVendor(prev => ({ ...prev, name: text }))}
                            placeholder="Tên đại lý"
                        />
                    ) : (
                        <Text style={styles.vendorName}>{vendor.name}</Text>
                    )}

                    <View style={styles.timeInfoContainer}>
                        <View style={styles.timeInfoItem}>
                            <Text style={styles.timeLabel}>Ngày tạo:</Text>
                            <Text style={styles.timeValue}>{formatDate(vendor.createdAt)}</Text>
                        </View>
                        <View style={styles.timeInfoItem}>
                            <Text style={styles.timeLabel}>Cập nhật lần cuối:</Text>
                            <Text style={styles.timeValue}>{formatDate(vendor.updatedAt)}</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>

                        <Text style={styles.fieldLabel}>Tỉnh/Thành phố</Text>
                        {isEditing ? (
                            <TouchableOpacity
                                style={styles.provinceButton}
                                onPress={() => setShowProvinceModal(true)}
                            >
                                <Text style={styles.provinceButtonText}>
                                    {editedVendor.province || 'Chọn tỉnh/thành phố'}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.fieldValue}>{vendor.province || 'Chưa có thông tin'}</Text>
                        )}

                        <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Địa chỉ</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={editedVendor.address}
                                onChangeText={(text) => setEditedVendor(prev => ({ ...prev, address: text }))}
                                placeholder="Địa chỉ"
                            />
                        ) : (
                            <Text style={styles.fieldValue}>{vendor.address}</Text>
                        )}

                        <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Số điện thoại</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={editedVendor.phone}
                                onChangeText={(text) => setEditedVendor(prev => ({ ...prev, phone: text }))}
                                placeholder="Số điện thoại"
                                keyboardType="phone-pad"
                            />
                        ) : (
                            <Text style={styles.fieldValue}>{vendor.phone}</Text>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Mô tả</Text>
                        {isEditing ? (
                            <TextInput
                                style={[styles.editInput, styles.descriptionInput]}
                                value={editedVendor.description}
                                onChangeText={(text) => setEditedVendor(prev => ({ ...prev, description: text }))}
                                placeholder="Mô tả đại lý"
                                multiline
                                numberOfLines={4}
                            />
                        ) : (
                            <Text style={styles.description}>{vendor.description || 'Chưa có mô tả'}</Text>
                        )}
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Quản lý người dùng được ủy quyền</Text>
                            {isEditing && (
                                <View style={styles.sectionHeader}>

                                    <TouchableOpacity
                                        style={[styles.addButton, { marginLeft: 10 }]}
                                        onPress={handleOpenAuthorizeModal}
                                    >
                                        <Text style={styles.addButtonText}>Ủy quyền</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {authorizedUsers.length > 0 ? (
                            <View style={styles.authorizedUsersContainer}>
                                {authorizedUsers.map(user => (
                                    <View key={user.userId} style={styles.authorizedUserItem}>
                                        <View style={styles.authorizedUserInfo}>
                                            <Text style={styles.authorizedUserName}>{user.fullName || user.username}</Text>
                                            <Text style={styles.authorizedUserUsername}>{user.username}</Text>
                                        </View>
                                        {isEditing && (
                                            <TouchableOpacity
                                                style={styles.removeUserButton}
                                                onPress={() => handleRemoveAuthorizedUser(user.userId)}
                                            >
                                                <Text style={styles.removeUserButtonText}>Hủy ủy quyền</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.emptyText}>Chưa có người dùng nào được ủy quyền</Text>
                        )}
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Yêu cầu nhập hàng</Text>
                            <View style={styles.requestStatusBadge}>
                                <Text style={styles.requestStatusText}>
                                    {vendor.hasOrders ? 'Có yêu cầu mới' : 'Không có yêu cầu mới'}
                                </Text>
                            </View>
                        </View>

                        {orderRequests.length > 0 ? (
                            <View style={styles.orderList}>
                                {orderRequests
                                    .filter(order => order.status !== 'approved' || 'rejected')
                                    .map((order) => (
                                        <View key={order.id} style={styles.orderItem}>
                                            <View style={styles.orderInfo}>
                                                <Text style={styles.orderProductName}>{order.productName}</Text>
                                                <Text style={styles.orderQuantity}>Số lượng: {order.quantity}</Text>
                                                <Text style={styles.orderDate}>
                                                    Ngày yêu cầu: {order.requestDate.toLocaleDateString('vi-VN')}
                                                </Text>
                                                <View style={[
                                                    styles.orderStatusBadge,
                                                    order.status === 'pending' ? styles.pendingBadge :
                                                        order.status === 'approved' ? styles.approvedBadge :
                                                            styles.rejectedBadge
                                                ]}>
                                                    <Text style={styles.orderStatusText}>
                                                        {order.status === 'pending' ? 'Đang chờ' :
                                                            order.status === 'approved' ? 'Đã duyệt' :
                                                                'Từ chối'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {order.status === 'pending' && (
                                                <View style={styles.orderActions}>
                                                    <TouchableOpacity
                                                        style={[styles.orderButton, styles.approveButton]}
                                                        onPress={() => handleUpdateOrderStatus(order.id, 'approved')}
                                                    >
                                                        <Text style={styles.orderButtonText}>Duyệt</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.orderButton, styles.rejectButton]}
                                                        onPress={() => handleUpdateOrderStatus(order.id, 'rejected')}
                                                    >
                                                        <Text style={styles.orderButtonText}>Từ chối</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    ))}
                            </View>
                        ) : (
                            <Text style={styles.emptyOrderText}>Chưa có yêu cầu nhập hàng nào</Text>
                        )}
                    </View>
                </View>
            </View>

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
                            {filteredProvinces.map((province) => (
                                <TouchableOpacity
                                    key={province}
                                    style={[
                                        styles.provinceItem,
                                        editedVendor.province === province && styles.selectedProvinceItem
                                    ]}
                                    onPress={() => handleProvinceSelect(province)}
                                >
                                    <Text style={[
                                        styles.provinceItemText,
                                        editedVendor.province === province && styles.selectedProvinceItemText
                                    ]}>
                                        {province}
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
                        <Text style={styles.modalMessage}>Bạn có chắc chắn muốn xóa đại lý này không?</Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalButtonCancel}
                                onPress={() => setShowDeleteModal(false)}
                            >
                                <Text style={styles.modalButtonText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButtonDelete}
                                onPress={async () => {
                                    try {
                                        console.log("Đang xóa đại lý...");
                                        await deleteDocument('vendors', id as string);
                                        setShowDeleteModal(false);
                                        Alert.alert("Thành công", "Đại lý đã được xóa");
                                        router.push('/vendors/vendor');
                                    } catch (error) {
                                        console.error('Lỗi khi xóa đại lý:', error);
                                        Alert.alert('Lỗi', 'Không thể xóa đại lý');
                                    }
                                }}
                            >
                                <Text style={styles.modalButtonText}>Xóa</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

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
                            style={styles.searchInput}
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
                                                <Text style={styles.userName}>{user.fullName || user.username}</Text>
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

            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.successModalContent}>
                        <Text style={styles.successModalTitle}>Thông báo</Text>
                        <Text style={styles.successModalMessage}>{successMessage}</Text>
                        <TouchableOpacity
                            style={styles.successModalButton}
                            onPress={() => {
                                setShowSuccessModal(false);
                                loadData(); // Tải lại dữ liệu sau khi đóng modal
                            }}
                        >
                            <Text style={styles.successModalButtonText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showStockWarningModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowStockWarningModal(false)}
            >
                <View style={styles.modalContainer}>
                    {/* Bạn có thể tái sử dụng style của successModal hoặc tạo style riêng */}
                    <View style={styles.successModalContent}>
                        <Text style={styles.successModalTitle}>Cảnh báo</Text>
                        <Text style={styles.successModalMessage}>{stockWarningMessage}</Text>
                        <TouchableOpacity
                            style={styles.successModalButton}
                            onPress={() => setShowStockWarningModal(false)} // Đóng modal khi nhấn nút
                        >
                            <Text style={styles.successModalButtonText}>Đã hiểu</Text>
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
        marginRight: 20,
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
    mainContent: {
        flex: 1,
        padding: 20,
    },
    imageSection: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        width: '100%',
        alignItems: 'center',
    },
    infoSection: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
    },
    vendorName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#3498db',
        paddingBottom: 10,
    },
    fieldLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6c757d',
        marginBottom: 8,
    },
    fieldValue: {
        fontSize: 16,
        color: '#2c3e50',
        marginBottom: 15,
        lineHeight: 24,
    },
    section: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        color: '#4a5568',
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    editButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginLeft: 'auto',
    },
    editButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    editActions: {
        flexDirection: 'row',
        gap: 10,
        marginLeft: 'auto',
    },
    actionButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    cancelButton: {
        backgroundColor: '#95a5a6',
    },
    saveButton: {
        backgroundColor: '#2ecc71',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    editInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        width: '100%',
        marginBottom: 10,
    },
    descriptionInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    uploadButton: {
        backgroundColor: '#3498db',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
        maxWidth: 500,
        maxHeight: '80%',
        padding: 20,
    },
    deleteModalContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        width: '80%',
        padding: 20,
        alignItems: 'center',
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
        marginBottom: 10,
    },
    modalMessage: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
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
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButtonCancel: {
        backgroundColor: '#95a5a6',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    modalButtonDelete: {
        backgroundColor: '#e74c3c',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        alignItems: 'center',
    },
    modalButtonText: {
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
    deleteButton: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginLeft: 10,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    requestStatusBadge: {
        padding: 4,
        borderRadius: 5,
        backgroundColor: '#f39c12',
    },
    requestStatusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    orderList: {
        marginTop: 10,
    },
    orderItem: {
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#eee',
    },
    orderInfo: {
        marginBottom: 10,
    },
    orderProductName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 5,
    },
    orderQuantity: {
        fontSize: 14,
        color: '#2c3e50',
        marginBottom: 5,
    },
    orderDate: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 5,
    },
    orderStatusBadge: {
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 5,
        marginTop: 5,
    },
    pendingBadge: {
        backgroundColor: '#f39c12',
    },
    approvedBadge: {
        backgroundColor: '#2ecc71',
    },
    rejectedBadge: {
        backgroundColor: '#e74c3c',
    },
    orderStatusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    orderActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    orderButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 5,
    },
    approveButton: {
        backgroundColor: '#2ecc71',
    },
    rejectButton: {
        backgroundColor: '#e74c3c',
    },
    orderButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyOrderText: {
        fontSize: 16,
        color: '#7f8c8d',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 10,
    },
    authorizedUsersContainer: {
        marginTop: 10,
    },
    authorizedUserItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    authorizedUserInfo: {
        flex: 1,
    },
    authorizedUserName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2c3e50',
    },
    authorizedUserUsername: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    removeUserButton: {
        backgroundColor: '#e74c3c',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    removeUserButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    usersList: {
        maxHeight: 400,
    },
    userItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    userItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2c3e50',
    },
    userRole: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    authorizeButton: {
        backgroundColor: '#3498db',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    authorizeButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    emptyUserText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#7f8c8d',
    },
    createUserNote: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#f1f9ff',
        borderRadius: 8,
        alignItems: 'center',
    },
    createUserText: {
        fontSize: 14,
        color: '#2c3e50',
        textAlign: 'center',
    },
    createUserLink: {
        fontSize: 14,
        color: '#3498db',
        fontWeight: '500',
        marginTop: 5,
        textDecorationLine: 'underline',
    },
    searchInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 15,
    },
    addButton: {
        backgroundColor: '#3498db',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 6,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 15,
        marginBottom: 15,
        color: '#95a5a6',
        fontStyle: 'italic',
    },
    timeInfoContainer: {
        marginTop: 20,
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        padding: 15,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    timeInfoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    timeLabel: {
        fontSize: 15,
        color: '#6c757d',
        fontWeight: '500',
    },
    timeValue: {
        fontSize: 15,
        color: '#2c3e50',
        fontWeight: '600',
    },
    successModalContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        width: '80%',
        maxWidth: 400,
        alignItems: 'center',
    },
    successModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
    },
    successModalMessage: {
        fontSize: 16,
        color: '#34495e',
        textAlign: 'center',
        marginBottom: 20,
    },
    successModalButton: {
        backgroundColor: '#3498db',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    successModalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});