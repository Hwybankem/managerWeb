import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFirestore } from '../../context/storageFirebase';
import { StatusToggle } from '../../components/common/UI/StatusToggle';
import { ImageManager } from '../../components/common/UI/ImageManager';
import * as ImagePicker from 'expo-image-picker';
import { uploadToImgBB } from '../../services/imgbbService';
import BackButton from '../../components/common/UI/backButton';

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
            
            const productData = await getDocument('products', id as string);
            if (productData) {
                setProduct(productData as Product);
                setEditedImages(productData.images);
                console.log('Tải dữ liệu sản phẩm thành công');
            }

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
                <BackButton path={'/products/product'} />
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
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Tên sản phẩm</Text>
                            <TextInput
                                style={styles.editInput}
                                value={editedProduct.name}
                                onChangeText={(text) => setEditedProduct(prev => ({ ...prev, name: text }))}
                                placeholder="Nhập tên sản phẩm"
                            />
                        </View>
                    ) : (
                        <Text style={styles.productName}>{product.name}</Text>
                    )}

                    {isEditing ? (
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Giá sản phẩm</Text>
                            <TextInput
                                style={styles.editInput}
                                value={editedProduct.price?.toString()}
                                onChangeText={(text) => setEditedProduct(prev => ({ ...prev, price: parseFloat(text) || 0 }))}
                                placeholder="Nhập giá sản phẩm"
                                keyboardType="numeric"
                            />
                        </View>
                    ) : (
                        <Text style={styles.productPrice}>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                        </Text>
                    )}

                    {isEditing ? (
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Số lượng</Text>
                            <TextInput
                                style={styles.editInput}
                                value={editedProduct.stock?.toString()}
                                onChangeText={(text) => setEditedProduct(prev => ({ ...prev, stock: parseInt(text) || 0 }))}
                                placeholder="Nhập số lượng"
                                keyboardType="numeric"
                            />
                        </View>
                    ) : (
                        <Text style={styles.stockStatus}>
                            {product.stock > 0 ? `Còn hàng (${product.stock})` : 'Hết hàng'}
                        </Text>
                    )}

                    {isEditing && (
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Trạng thái</Text>
                            <StatusToggle
                                status={editedProduct.status || 'active'}
                                onStatusChange={(status) => setEditedProduct(prev => ({ ...prev, status }))}
                            />
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Mô tả</Text>
                        {isEditing ? (
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Mô tả sản phẩm</Text>
                                <TextInput
                                    style={[styles.editInput, styles.descriptionInput]}
                                    value={editedProduct.description}
                                    onChangeText={(text) => setEditedProduct(prev => ({ ...prev, description: text }))}
                                    placeholder="Nhập mô tả sản phẩm"
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>
                        ) : (
                            <Text style={styles.description}>{product.description}</Text>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Danh mục</Text>
                        <View style={styles.categoriesContainer}>
                            {(() => {
                                const elements: JSX.Element[] = [];
                                
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
                                        
                                        if (cat.subCategories && cat.subCategories.length > 0) {
                                            const found = findAndRenderCategory(cat.subCategories, categoryName);
                                            if (found) return true;
                                        }
                                    }
                                    return false;
                                };
                                
                                product?.categories?.forEach(categoryName => {
                                    const categoryFound = findAndRenderCategory(categories, categoryName);
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
                        {isEditing && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Chọn danh mục</Text>
                                <TouchableOpacity
                                    style={styles.categoryButton}
                                    onPress={() => setShowCategoryModal(true)}
                                >
                                    <Text style={styles.categoryButtonText}>
                                        Danh sách danh mục
                                    </Text>
                                </TouchableOpacity>
                            </View>
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
        backgroundColor: '#f5f7fa',
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
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a2b49',
        flex: 1,
        textAlign: 'center',
    },
    mainContent: {
        flex: 1,
        padding: 15,
    },
    imageSection: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
        alignItems: 'center',
    },
    productImage: {
        width: '100%',
        height: Platform.OS === 'web' ? 500 : 350,
        borderRadius: 12,
        backgroundColor: '#f0f2f5',
        resizeMode: 'cover',
    },
    thumbnailContainer: {
        marginTop: 15,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    thumbnailWrapper: {
        margin: 5,
    },
    thumbnail: {
        width: 80,
        height: 80,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#e0e4e7',
        backgroundColor: '#f0f2f5',
    },
    selectedThumbnail: {
        borderColor: '#007AFF',
        borderWidth: 3,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    infoSection: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    productName: {
        fontSize: 30,
        fontWeight: '700',
        color: '#1a2b49',
        marginBottom: 10,
    },
    productPrice: {
        fontSize: 26,
        color: '#e63946',
        fontWeight: '600',
        marginBottom: 10,
    },
    stockInfo: {
        marginBottom: 20,
    },
    stockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e6f0fa',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    stockStatus: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a2b49',
        marginRight: 8,
    },
    stockQuantity: {
        fontSize: 16,
        color: '#666',
    },
    section: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#e0e4e7',
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a2b49',
        marginBottom: 15,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        color: '#4a5568',
    },
    categoriesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    categoryTag: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#bbdefb',
    },
    categoryText: {
        color: '#1976d2',
        fontSize: 14,
        fontWeight: '500',
    },
    editButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        marginLeft: 10,
        shadowColor: '#007AFF',
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
    editActions: {
        flexDirection: 'row',
        gap: 12,
        marginLeft: 'auto',
    },
    actionButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    cancelButton: {
        backgroundColor: '#a0aec0',
    },
    saveButton: {
        backgroundColor: '#28a745',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    inputContainer: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a2b49',
        marginBottom: 8,
    },
    editInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9fafb',
    },
    descriptionInput: {
        height: 120,
        textAlignVertical: 'top',
    },
    statusContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
        marginBottom: 15,
    },
    statusButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#d1d5db',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    statusButtonActive: {
        backgroundColor: '#28a745',
        borderColor: '#28a745',
    },
    statusButtonInactive: {
        backgroundColor: '#dc3545',
        borderColor: '#dc3545',
    },
    statusButtonText: {
        fontSize: 16,
        color: '#4a5568',
    },
    statusButtonTextActive: {
        color: '#fff',
    },
    statusButtonTextInactive: {
        color: '#fff',
    },
    uploadButton: {
        backgroundColor: '#007bff',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
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
    categoryButton: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        padding: 15,
        backgroundColor: '#f9fafb',
        alignItems: 'center',
    },
    categoryButtonText: {
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
        width: '85%',
        backgroundColor: '#ffffff',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a2b49',
        marginBottom: 15,
    },
    modalMessage: {
        fontSize: 16,
        color: '#4a5568',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 10,
    },
    modalButtonCancel: {
        backgroundColor: '#a0aec0',
        padding: 12,
        borderRadius: 10,
        flex: 1,
        alignItems: 'center',
    },
    modalButtonDelete: {
        backgroundColor: '#dc3545',
        padding: 12,
        borderRadius: 10,
        flex: 1,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    categoryModalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 15,
        width: '90%',
        maxHeight: '80%',
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    categoryModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    categoryModalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a2b49',
    },
    modalCloseButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e63946',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseButtonText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    categoryList: {
        maxHeight: 450,
    },
    categoryItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e4e7',
        borderRadius: 8,
        marginBottom: 5,
    },
    selectedCategory: {
        backgroundColor: '#007bff',
    },
    categoryItemText: {
        fontSize: 16,
        color: '#1a2b49',
        fontWeight: '500',
    },
    selectedCategoryText: {
        color: '#fff',
    },
    deleteButton: {
        backgroundColor: '#dc3545',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        marginLeft: 10,
        shadowColor: '#dc3545',
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
});