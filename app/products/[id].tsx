import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFirestore } from '../../context/storageFirebase';
import { StatusToggle } from '../../component/StatusToggle';
import { ImageManager } from '../../component/ImageManager';
import * as ImagePicker from 'expo-image-picker';
import { uploadToImgBB } from '../../services/imgbbService';

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    images: string[];
    categories: string[];
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}

interface Category {
    id: string;
    name: string;
    parentId?: string;
    parentName?: string;
    subCategories?: Category[];
}

export default function ProductDetail() {
    const { id } = useLocalSearchParams();
    const { getDocument, updateDocument, getDocuments, deleteDocument } = useFirestore();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedProduct, setEditedProduct] = useState<Partial<Product>>({});
    const [editedImages, setEditedImages] = useState<string[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const loadData = async () => {
        try {
            console.log('Tải dữ liệu cho ID sản phẩm:', id);
            setLoading(true);
            
            // Load product
            const productData = await getDocument('products', id as string);
            if (productData) {
                setProduct(productData as Product);
                setEditedImages(productData.images);
                console.log('Tải dữ liệu sản phẩm thành công');
            }

            // Load categories
            const categoriesData = await getDocuments('categories');
            console.log('Số danh mục đã tải:', categoriesData.length);

            const categoryMap = new Map<string, Category>();
            const rootCategories: Category[] = [];

            categoriesData.forEach((category: any) => {
                categoryMap.set(category.id, {
                    id: category.id,
                    name: category.name,
                    parentId: category.parentId,
                    parentName: category.parentName,
                    subCategories: []
                });
            });

            categoriesData.forEach((category: any) => {
                const categoryNode = categoryMap.get(category.id)!;
                if (category.parentId) {
                    const parent = categoryMap.get(category.parentId);
                    if (parent) {
                        parent.subCategories = parent.subCategories || [];
                        parent.subCategories.push(categoryNode);
                    }
                } else {
                    rootCategories.push(categoryNode);
                }
            });

            setCategories(rootCategories);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
            Alert.alert('Lỗi', 'Không thể tải dữ liệu sản phẩm. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Bắt sự kiện window khi DOM đã sẵn sàng
        if (typeof window !== 'undefined') {
            // Lưu vị trí hiện tại vào history state
            const pushState = () => {
                const state = { id };
                window.history.pushState(state, '', window.location.href);
            };
            
            // Gọi pushState để lưu trạng thái hiện tại
            pushState();
            
            // Bắt sự kiện popstate (khi người dùng nhấn nút back)
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
        router.push('/products/product');
    };

    const handleDelete = () => {
        setShowDeleteModal(true);
    };

    const handleEdit = () => {
        setIsEditing(true);
        setEditedProduct({
            name: product?.name,
            description: product?.description,
            price: product?.price,
            stock: product?.stock,
            status: product?.status,
            categories: product?.categories
        });
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            const url = await uploadToImgBB(result.assets[0].uri);
            setEditedImages([...editedImages, url]);
        }
    };

    const handleSave = async () => {
        try {
            if (!editedProduct.name || !editedProduct.description || !editedProduct.price || !editedProduct.stock) {
                Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
                return;
            }

            const updatedData = {
                ...editedProduct,
                images: editedImages,
                updatedAt: new Date()
            };

            await updateDocument('products', id as string, updatedData);
            setProduct(prev => prev ? { ...prev, ...updatedData } : null);
            setIsEditing(false);
            Alert.alert('Thành công', 'Đã cập nhật sản phẩm thành công');
        } catch (error) {
            console.error('Lỗi khi cập nhật sản phẩm:', error);
            Alert.alert('Lỗi', 'Không thể cập nhật sản phẩm');
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedProduct({});
        setEditedImages(product?.images || []);
    };

    const toggleCategory = (categoryId: string) => {
        setEditedProduct(prev => {
            const currentCategories = prev.categories || [];
            if (currentCategories.includes(categoryId)) {
                return { ...prev, categories: currentCategories.filter(id => id !== categoryId) };
            }
            return { ...prev, categories: [...currentCategories, categoryId] };
        });
    };

    const renderCategoryItem = (category: Category, level: number = 0) => {
        const isSelected = editedProduct.categories?.includes(category.id);
        return (
            <View key={category.id}>
                <TouchableOpacity
                    style={[styles.categoryItem, { paddingLeft: 20 + level * 20 }, isSelected && styles.selectedCategory]}
                    onPress={() => toggleCategory(category.id)}
                >
                    <Text style={[styles.categoryItemText, isSelected && styles.selectedCategoryText]}>
                        {category.name} {category.parentName ? `(thuộc ${category.parentName})` : ''}
                    </Text>
                </TouchableOpacity>
                {category.subCategories?.map(subCategory => renderCategoryItem(subCategory, level + 1))}
            </View>
        );
    };

    if (loading) return <View style={styles.container}><Text>Đang tải...</Text></View>;

    if (!product) return <View style={styles.container}><Text>Không tìm thấy sản phẩm</Text></View>;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                    <Text style={styles.backButtonText}>← Quay lại</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết sản phẩm</Text>
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
                                images={editedImages}
                                onRemoveImage={(index) => setEditedImages(editedImages.filter((_, i) => i !== index))}
                                showRemoveButton={true}
                            />
                            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                                <Text style={styles.uploadButtonText}>Thêm ảnh</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <ImageManager
                            images={product?.images || []}
                            showRemoveButton={false}
                        />
                    )}
                </View>

                <View style={styles.infoSection}>
                    {isEditing ? (
                        <TextInput
                            style={styles.editInput}
                            value={editedProduct.name}
                            onChangeText={(text) => setEditedProduct(prev => ({ ...prev, name: text }))}
                            placeholder="Tên sản phẩm"
                        />
                    ) : (
                        <Text style={styles.productName}>{product.name}</Text>
                    )}

                    {isEditing ? (
                        <TextInput
                            style={styles.editInput}
                            value={editedProduct.price?.toString()}
                            onChangeText={(text) => setEditedProduct(prev => ({ ...prev, price: parseFloat(text) || 0 }))}
                            placeholder="Giá sản phẩm"
                            keyboardType="numeric"
                        />
                    ) : (
                        <Text style={styles.productPrice}>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                        </Text>
                    )}

                    {isEditing ? (
                        <TextInput
                            style={styles.editInput}
                            value={editedProduct.stock?.toString()}
                            onChangeText={(text) => setEditedProduct(prev => ({ ...prev, stock: parseInt(text) || 0 }))}
                            placeholder="Số lượng"
                            keyboardType="numeric"
                        />
                    ) : (
                        <Text style={styles.stockStatus}>
                            {product.stock > 0 ? `Còn hàng (${product.stock})` : 'Hết hàng'}
                        </Text>
                    )}

                    {isEditing && (
                        <StatusToggle
                            status={editedProduct.status || 'active'}
                            onStatusChange={(status) => setEditedProduct(prev => ({ ...prev, status }))}
                        />
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Mô tả</Text>
                        {isEditing ? (
                            <TextInput
                                style={[styles.editInput, styles.descriptionInput]}
                                value={editedProduct.description}
                                onChangeText={(text) => setEditedProduct(prev => ({ ...prev, description: text }))}
                                placeholder="Mô tả sản phẩm"
                                multiline
                                numberOfLines={4}
                            />
                        ) : (
                            <Text style={styles.description}>{product.description}</Text>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Danh mục</Text>
                        <View style={styles.categoriesContainer}>
                            {(() => {
                                const elements: JSX.Element[] = [];
                                
                                // Hàm đệ quy để tìm và hiển thị danh mục cùng các danh mục con
                                const findAndRenderCategory = (categoryList: Category[], categoryName: string): boolean => {
                                    for (const cat of categoryList) {
                                        if (cat.name === categoryName) {
                                            elements.push(
                                                <View key={cat.id} style={styles.categoryTag}>
                                                    <Text style={styles.categoryText}>{cat.name}</Text>
                                                </View>
                                            );
                                            return true;
                                        }
                                        
                                        // Kiểm tra danh mục con
                                        if (cat.subCategories && cat.subCategories.length > 0) {
                                            const found = findAndRenderCategory(cat.subCategories, categoryName);
                                            if (found) return true;
                                        }
                                    }
                                    return false;
                                };
                                
                                // Duyệt qua từng categoryName trong product.categories
                                product?.categories?.forEach(categoryName => {
                                    // Tìm và hiển thị danh mục
                                    const categoryFound = findAndRenderCategory(categories, categoryName);
                                    
                                    // Nếu không tìm thấy, hiển thị tên danh mục từ product.categories
                                    if (!categoryFound) {
                                        elements.push(
                                            <View key={categoryName} style={styles.categoryTag}>
                                                <Text style={styles.categoryText}>{categoryName}</Text>
                                            </View>
                                        );
                                    }
                                });
                                
                                return elements;
                            })()}
                        </View>
                        {isEditing ? (
                            <TouchableOpacity
                                style={styles.categoryButton}
                                onPress={() => setShowCategoryModal(true)}
                            >
                                <Text style={styles.categoryButtonText}>
                                    {editedProduct.categories?.length ? 'Đã chọn danh mục' : 'Chọn danh mục'}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <></>
                        )}
                    </View>
                </View>
            </View>

            <Modal visible={showCategoryModal} transparent onRequestClose={() => setShowCategoryModal(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.categoryModalContent}>
                        <View style={styles.categoryModalHeader}>
                            <Text style={styles.categoryModalTitle}>Chọn Danh mục</Text>
                            <TouchableOpacity
                                onPress={() => setShowCategoryModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseButtonText}>×</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.categoryList}>
                            {categories.map(category => renderCategoryItem(category))}
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
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Xác nhận xóa</Text>
                        <Text style={styles.modalMessage}>Bạn có chắc chắn muốn xóa sản phẩm này không?</Text>
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
                                        console.log("Đang xóa sản phẩm...");
                                        await deleteDocument('products', id as string);
                                        setShowDeleteModal(false);
                                        Alert.alert("Thành công", "Sản phẩm đã được xóa");
                                        router.push('/products/product');
                                    } catch (error) {
                                        console.error('Lỗi khi xóa sản phẩm:', error);
                                        Alert.alert('Lỗi', 'Không thể xóa sản phẩm');
                                    }
                                }}
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
    productImage: {
        width: Platform.OS === 'web' ? '100%' : '100%',
        height: Platform.OS === 'web' ? 600 : 400,
        borderRadius: 10,
        backgroundColor: '#f8f8f8',
        maxWidth: 800,
    },
    thumbnailContainer: {
        marginTop: 15,
        width: '100%',
    },
    thumbnailWrapper: {
        marginRight: 10,
    },
    thumbnail: {
        width: 100,
        height: 100,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#eee',
    },
    selectedThumbnail: {
        borderColor: '#007AFF',
        borderWidth: 3,
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
    },
    productHeader: {
        marginBottom: 20,
    },
    productName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 10,
    },
    productPrice: {
        fontSize: 24,
        color: '#E53935',
        fontWeight: 'bold',
    },
    stockInfo: {
        marginBottom: 25,
    },
    stockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    stockStatus: {
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    stockQuantity: {
        fontSize: 16,
        color: '#666',
    },
    section: {
        marginTop: 25,
        paddingTop: 25,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        color: '#666',
    },
    categoriesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    categoryTag: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    categoryText: {
        color: '#1976D2',
        fontSize: 14,
        fontWeight: '500',
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
    },
    descriptionInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    statusContainer: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    statusButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    statusButtonActive: {
        backgroundColor: '#2ecc71',
        borderColor: '#2ecc71',
    },
    statusButtonInactive: {
        backgroundColor: '#e74c3c',
        borderColor: '#e74c3c',
    },
    statusButtonText: {
        fontSize: 16,
        color: '#666',
    },
    statusButtonTextActive: {
        color: '#fff',
    },
    statusButtonTextInactive: {
        color: '#fff',
    },
    uploadButton: {
        backgroundColor: '#3498db',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    categoryButton: {
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        backgroundColor: '#fff',
    },
    categoryButtonText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
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
    categoryModalContent: {
        backgroundColor: '#fff',
        borderRadius: 15,
        width: '90%',
        maxHeight: '80%',
        padding: 25,
    },
    categoryModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    categoryModalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    modalCloseButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseButtonText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    categoryList: {
        maxHeight: 500,
    },
    categoryItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedCategory: {
        backgroundColor: '#3498db',
    },
    categoryItemText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    selectedCategoryText: {
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
});