import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, SafeAreaView, Platform, ScrollView, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import { useFirestore } from '../../context/storageFirebase';
import removeAccents from '@/components/utils/stringUtils'; 
import BackButton from '@/components/common/UI/backButton';
import AddButton from '@/components/common/UI/addButton';

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
    province: string; // Thêm tỉnh/thành phố
    phone: string;
    logo: string;
    hasOrders?: boolean; // Thêm trường để đánh dấu đại lý có yêu cầu nhập hàng
    authorizedUsers?: AuthorizedUser[]; // Danh sách người dùng được ủy quyền
    createdAt: Date;
    updatedAt: Date;
}

// Danh sách các tỉnh thành Việt Nam
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


export default function App() {
    const { getDocuments } = useFirestore();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
    const [showProvinceModal, setShowProvinceModal] = useState(false);
    const [filteredProvinces, setFilteredProvinces] = useState<string[]>(vietnamProvinces);
    const [provinceSearchQuery, setProvinceSearchQuery] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        filterVendors(searchQuery, selectedProvince);
    }, [searchQuery, selectedProvince, vendors]);

    useEffect(() => {
        if (provinceSearchQuery.trim() === '') {
            setFilteredProvinces(vietnamProvinces);
        } else {
            const query = removeAccents(provinceSearchQuery.toLowerCase());
            const filtered = vietnamProvinces.filter(province => 
                removeAccents(province.toLowerCase()).includes(query)
            );
            setFilteredProvinces(filtered);
        }
    }, [provinceSearchQuery]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Load vendors
            const vendorsData = await getDocuments('vendors');
            const formattedVendors: Vendor[] = vendorsData.map((vendor: any) => ({
                id: vendor.id,
                name: vendor.name,
                description: vendor.description,
                address: vendor.address,
                province: vendor.province || 'Chưa xác định',
                phone: vendor.phone,
                logo: vendor.logo,
                hasOrders: vendor.hasOrders || false,
                authorizedUsers: vendor.authorizedUsers || [],
                createdAt: vendor.createdAt?.toDate() || new Date(),
                updatedAt: vendor.updatedAt?.toDate() || new Date()
            }));

            setVendors(formattedVendors);
            setFilteredVendors(formattedVendors);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterVendors = (query: string, province: string | null) => {
        let filtered = [...vendors];

        // Lọc theo tìm kiếm tên đại lý
        if (query.trim()) {
            const searchTerms = removeAccents(query.toLowerCase()).split(' ').filter(term => term);
            filtered = filtered.filter(vendor => {
                const vendorName = removeAccents(vendor.name.toLowerCase());
                return searchTerms.every(term => vendorName.includes(term));
            });
        }

        // Lọc theo tỉnh thành
        if (province) {
            filtered = filtered.filter(vendor => 
                removeAccents(vendor.province.toLowerCase()) === removeAccents(province.toLowerCase())
            );
        }

        setFilteredVendors(filtered);
    };

    const handleVendorPress = (vendor: Vendor) => {
        // Chuyển đến trang chi tiết đại lý
        router.push({
            pathname: "/vendors/[id]",
            params: { id: vendor.id }
        } as any);
    };

    const handleProvinceSelect = (province: string) => {
        setSelectedProvince(province);
        setShowProvinceModal(false);
        setProvinceSearchQuery('');
    };

    const clearProvinceFilter = () => {
        setSelectedProvince(null);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainContent}>
                <View style={styles.header}>
                    <BackButton path={'/navigator'}/>
                    <Text style={styles.title}>Danh sách đại lý</Text>
                    <AddButton path={'/vendors/addVendor'} text={'Đại lý'} />
                </View>

                <View style={styles.filtersContainer}>
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm kiếm đại lý..."
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

                    <View style={styles.provinceFilterContainer}>
                        <TouchableOpacity
                            style={styles.provinceButton}
                            onPress={() => setShowProvinceModal(true)}
                        >
                            <Text style={styles.provinceButtonText}>
                                {selectedProvince ? selectedProvince : 'Chọn tỉnh/thành phố'}
                            </Text>
                        </TouchableOpacity>
                        
                        {selectedProvince && (
                            <TouchableOpacity
                                style={styles.clearProvinceButton}
                                onPress={clearProvinceFilter}
                            >
                                <Text style={styles.clearProvinceButtonText}>×</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <FlatList
                    data={filteredVendors}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.vendorCard}
                            onPress={() => handleVendorPress(item)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.vendorCardHeader}>
                                <Image
                                    source={{ uri: item.logo || 'https://via.placeholder.com/150' }}
                                    style={styles.vendorImage}
                                    resizeMode="cover"
                                />
                                {item.hasOrders && (
                                    <View style={styles.notificationBadge}>
                                        <Text style={styles.notificationText}>!</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.vendorInfo}>
                                <Text style={styles.vendorName} numberOfLines={2}>
                                    {item.name}
                                </Text>
                                <View style={styles.vendorDetails}>
                                    <View style={styles.vendorProvinceContainer}>
                                        <Text style={styles.vendorProvince} numberOfLines={1}>
                                            {item.province}
                                        </Text>
                                    </View>
                                    <Text style={styles.vendorAddress} numberOfLines={1}>
                                        <Text style={styles.labelText}>Địa chỉ: </Text>{item.address}
                                    </Text>
                                    <Text style={styles.vendorContact} numberOfLines={1}>
                                        <Text style={styles.labelText}>SĐT: </Text>{item.phone}
                                    </Text>
                                    {item.authorizedUsers && item.authorizedUsers.length > 0 && (
                                        <View style={styles.authorizedUsersContainer}>
                                            <Text style={styles.authorizedUsersText}>
                                                {`${item.authorizedUsers.length} người dùng được ủy quyền`}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={styles.viewDetailButton}
                                    onPress={() => handleVendorPress(item)}
                                >
                                    <Text style={styles.viewDetailText}>Xem chi tiết</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    )}
                    keyExtractor={item => item.id}
                    numColumns={Platform.OS === 'web' ? 4 : 2}
                    contentContainerStyle={styles.vendorGrid}
                    columnWrapperStyle={styles.vendorRow}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {loading ? 'Đang tải...' : 'Không có đại lý nào'}
                            </Text>
                            {!loading && (
                                <TouchableOpacity
                                    style={styles.emptyAddButton}
                                    onPress={() => router.push('/vendors/addVendor')}
                                >
                                    <Text style={styles.emptyAddButtonText}>+ Thêm đại lý mới</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />

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
                                {filteredProvinces.map((province) => (
                                    <TouchableOpacity
                                        key={province}
                                        style={[
                                            styles.provinceItem,
                                            selectedProvince === province && styles.selectedProvinceItem
                                        ]}
                                        onPress={() => handleProvinceSelect(province)}
                                    >
                                        <Text style={[
                                            styles.provinceItemText,
                                            selectedProvince === province && styles.selectedProvinceItemText
                                        ]}>
                                            {province}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        width: '100%',
    },
    mainContent: {
        flex: 1,
        maxWidth: 1920,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: 20,
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
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2c3e50',
        letterSpacing: 0.5,
    },
    addButton: {
        backgroundColor: '#2ecc71',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    filtersContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
        width: '100%',
        gap: 15,
    },
    searchContainer: {
        position: 'relative',
        flex: 1,
    },
    searchInput: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 10,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        color: '#2c3e50',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    clearButton: {
        position: 'absolute',
        right: 15,
        top: '50%',
        transform: [{ translateY: -12 }],
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#95a5a6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    provinceFilterContainer: {
        position: 'relative',
        width: '30%',
    },
    provinceButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    provinceButtonText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    clearProvinceButton: {
        position: 'absolute',
        right: 15,
        top: '50%',
        transform: [{ translateY: -12 }],
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#e74c3c',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    clearProvinceButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    vendorGrid: {
        padding: 10,
    },
    vendorRow: {
        gap: 20,
        justifyContent: 'flex-start',
    },
    vendorCard: {
        flex: 1,
        maxWidth: Platform.OS === 'web' ? '23%' : '48%',
        backgroundColor: '#fff',
        borderRadius: 15,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        transform: [{ scale: 1 }],
    },
    vendorCardHeader: {
        position: 'relative',
        width: '100%',
    },
    vendorImage: {
        width: '100%',
        height: 170,
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    notificationBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#e74c3c',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    notificationText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    vendorInfo: {
        padding: 18,
    },
    vendorName: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        color: '#2c3e50',
        height: 50,
        lineHeight: 24,
    },
    vendorDetails: {
        marginBottom: 15,
    },
    vendorProvinceContainer: {
        backgroundColor: '#ecf0f1',
        borderRadius: 15,
        paddingVertical: 5,
        paddingHorizontal: 12,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    vendorProvince: {
        fontSize: 14,
        fontWeight: '600',
        color: '#34495e',
    },
    vendorAddress: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 5,
        lineHeight: 20,
    },
    vendorContact: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 10,
    },
    labelText: {
        fontWeight: '600',
        color: '#34495e',
    },
    viewDetailButton: {
        backgroundColor: '#3498db',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
    },
    viewDetailText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        backgroundColor: '#fff',
        borderRadius: 15,
        marginTop: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 18,
        color: '#7f8c8d',
        marginBottom: 15,
    },
    emptyAddButton: {
        backgroundColor: '#2ecc71',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    emptyAddButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
        width: '80%',
        maxWidth: 500,
        maxHeight: '80%',
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
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
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#e74c3c',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    provinceSearchContainer: {
        marginBottom: 20,
    },
    provinceSearchInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    provinceList: {
        maxHeight: 400,
    },
    provinceItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        borderRadius: 8,
        marginBottom: 5,
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
        fontWeight: '600',
    },
    authorizedUsersContainer: {
        backgroundColor: '#f1c40f',
        borderRadius: 8,
        padding: 6,
        marginBottom: 10,
        alignSelf: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    authorizedUsersText: {
        fontSize: 12,
        color: '#2c3e50',
        fontWeight: '600',
    },
}); 