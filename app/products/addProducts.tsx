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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFirestore } from '../../context/storageFirebase';
import { uploadToImgBB } from '../../services/imgbbService';
import BackButton from '../../components/common/UI/backButton';


interface Category {
    id: string;
    name: string;
    parentId?: string;
    subCategories?: Category[];
}

interface Product {
    id?: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    images: string[];
    categories: string[];
    status: 'active' | 'inactive';
    createdAt?: Date;
    updatedAt?: Date;
}

export default function CRUDProducts() {
    const { addDocument, getDocuments,  deleteDocument, loading: firestoreLoading, error } = useFirestore();
    const [categories, setCategories] = useState<Category[]>([]);
    const [productName, setProductName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedParentCategory, setSelectedParentCategory] = useState<string | null>(null);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const categoriesData = await getDocuments('categories');
            // Chuyển đổi dữ liệu phẳng thành cấu trúc cây
            const categoryMap = new Map<string, Category>();
            const rootCategories: Category[] = [];

            // Đầu tiên, tạo map cho tất cả categories
            categoriesData.forEach((category: any) => {
                categoryMap.set(category.id, {
                    id: category.id,
                    name: category.name,
                    parentId: category.parentId,
                    subCategories: []
                });
            });

            // Sau đó, xây dựng cấu trúc cây
            categoriesData.forEach((category: any) => {
                const categoryNode = categoryMap.get(category.id)!;
                if (category.parentId) {
                    const parent = categoryMap.get(category.parentId);
                    if (parent) {
                        if (!parent.subCategories) {
                            parent.subCategories = [];
                        }
                        parent.subCategories.push(categoryNode);
                    }
                } else {
                    rootCategories.push(categoryNode);
                }
            });

            setCategories(rootCategories);
            console.log('Categories đã được load:', rootCategories);
        } catch (err) {
            console.error('Lỗi khi load categories:', err);
            Alert.alert('Lỗi', 'Không thể tải danh sách danh mục');
        }
    };

    const handleSubmit = async () => {
        console.log('Bắt đầu quá trình thêm sản phẩm...');
        
        if (!productName || !description || !price || !stock) {
            console.log('Lỗi: Thiếu thông tin sản phẩm');
            setErrorMessage('Vui lòng điền đầy đủ thông tin');
            setShowErrorModal(true);
            return;
        }
    
        try {
            setIsSubmitting(true);
            console.log('Bắt đầu upload ảnh lên ImgBB...');
            // Upload ảnh lên ImgBB
            const imgbbUrls = [];
            for (let i = 0; i < images.length; i++) {
                try {
                    console.log(`Đang upload ảnh thứ ${i + 1}/${images.length}`);
                    const url = await uploadToImgBB(images[i]);
                    console.log(`Upload ảnh ${i + 1} thành công:`, url);
                    imgbbUrls.push(url);
                } catch (error) {
                    console.error(`Lỗi khi upload ảnh ${i + 1}:`, error);
                    setErrorMessage(`Không thể upload ảnh thứ ${i + 1}. Vui lòng thử lại sau.`);
                    setShowErrorModal(true);
                    return;
                }
            }
            console.log('Tất cả ảnh đã được upload thành công:', imgbbUrls);
    
            const productData: Product = {
                name: productName,
                description: description,
                price: parseFloat(price),
                stock: parseInt(stock),
                images: imgbbUrls,
                categories: selectedCategories,
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            console.log('Dữ liệu sản phẩm sẽ được lưu:', productData);
    
            console.log('Đang lưu sản phẩm vào Firestore...');
            await addDocument('products', productData, productName);
            console.log('Lưu sản phẩm thành công!');
            
            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
                resetForm();
            }, 2000);
        } catch (err) {
            console.error('Lỗi khi thêm sản phẩm:', err);
            setErrorMessage(err instanceof Error ? err.message : 'Không thể lưu sản phẩm');
            setShowErrorModal(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setProductName('');
        setDescription('');
        setPrice('');
        setStock('');
        setImages([]);
        setSelectedCategories([]);
    };

    const findCategoryById = (categories: Category[], id: string): Category | null => {
        for (const category of categories) {
            if (category.id === id) {
                return category;
            }
            if (category.subCategories && category.subCategories.length > 0) {
                const found = findCategoryById(category.subCategories, id);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    };
    
    const getSelectedCategoryNames = () => {
        return selectedCategories
            .map(id => {
                const category = findCategoryById(categories, id);
                if (!category) return '';
    
                // Nếu danh mục có parentId, tìm danh mục cha và hiển thị theo định dạng "Cha > Con"
                if (category.parentId) {
                    const parentCategory = findCategoryById(categories, category.parentId);
                    return parentCategory ? `${parentCategory.name} > ${category.name}` : category.name;
                }
                return category.name;
            })
            .filter(Boolean)
            .join(' || ');
    };

    const toggleCategory = (categoryId: string) => {
        setSelectedCategories(prev => {
            const category = findCategoryById(categories, categoryId);
            if (!category) return prev;

            if (prev.includes(categoryId)) {
                // Nếu bỏ chọn danh mục con
                if (category.parentId) {
                    // Kiểm tra xem còn danh mục con nào khác được chọn không
                    const parentCategory = findCategoryById(categories, category.parentId);
                    if (parentCategory && parentCategory.subCategories) {
                        const hasOtherSelectedSubCategories = parentCategory.subCategories.some(
                            subCat => subCat.id !== categoryId && prev.includes(subCat.id)
                        );
                        
                        // Chỉ bỏ chọn danh mục gốc nếu không còn danh mục con nào được chọn
                        if (!hasOtherSelectedSubCategories) {
                            return prev.filter(id => id !== categoryId && id !== category.parentId);
                        }
                    }
                    return prev.filter(id => id !== categoryId);
                }
                return prev.filter(id => id !== categoryId);
            } else {
                // Nếu chọn danh mục con, tự động chọn cả danh mục gốc
                if (category.parentId) {
                    return [...new Set([...prev, categoryId, category.parentId])];
                }
                return [...prev, categoryId];
            }
        });
    };

    const pickImage = async () => {
        if (Platform.OS === 'web') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e: Event) => {
                const target = e.target as HTMLInputElement;
                if (target.files && target.files[0]) {
                    const file = target.files[0];
                    setImages([...images, URL.createObjectURL(file)]);
                }
            };
            input.click();
        } else {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
            });

            if (!result.canceled) {
                setImages([...images, result.assets[0].uri]);
            }
        }
    };
    
    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const getImageSource = (uri: string) => {
        return { uri };
    };

    const openImageModal = (uri: string, index: number) => {
        setSelectedImage(uri);
        setCurrentImageIndex(index);
    };

    const navigateImage = (direction: 'left' | 'right') => {
        let newIndex;
        if (direction === 'left') {
            newIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
        } else {
            newIndex = currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1;
        }
        setCurrentImageIndex(newIndex);
        setSelectedImage(images[newIndex]);
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục');
            return;
        }

        try {
            const categoryName = newCategoryName.trim();
            const parentCategory = selectedParentCategory 
                ? categories.find(cat => cat.id === selectedParentCategory)
                : null;

            const categoryData = {
                name: categoryName,
                parentId: selectedParentCategory || null,
                parentName: parentCategory?.name || null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await addDocument('categories', categoryData, categoryName);
            setNewCategoryName('');
            setSelectedParentCategory(null);
            setShowAddCategoryModal(false);
            loadCategories();
            Alert.alert('Thành công', 'Đã thêm danh mục mới');
        } catch (err) {
            console.error('Lỗi khi thêm category:', err);
            Alert.alert('Lỗi', 'Không thể thêm danh mục mới');
        }
    };

    const handleDeleteCategory = async (category: Category) => {
        try {
            await deleteDocument('categories', category.id);
            loadCategories();
            Alert.alert('Thành công', 'Đã xóa danh mục');
        } catch (err) {
            console.error('Lỗi khi xóa category:', err);
            Alert.alert('Lỗi', 'Không thể xóa danh mục');
        }
    };

    const renderCategoryItem = (category: Category, level: number = 0) => {
        const hasSubCategories = category.subCategories && category.subCategories.length > 0;
        const isSelected = selectedCategories.includes(category.id);

        return (
            <View key={category.id}>
                <TouchableOpacity
                    style={[
                        styles.categoryItem,
                        { paddingLeft: 20 + level * 20 },
                        isSelected && styles.selectedCategory
                    ]}
                    onPress={() => toggleCategory(category.id)}
                >
                    <View style={styles.categoryItemContent}>
                        <Text style={[
                            styles.categoryItemText,
                            isSelected && styles.selectedCategoryText
                        ]}>
                            {category.name}
                        </Text>
                        <View style={styles.categoryItemActions}>
                            <TouchableOpacity
                                style={styles.addSubCategoryButton}
                                onPress={() => {
                                    setSelectedParentCategory(category.id);
                                    setShowAddCategoryModal(true);
                                }}
                            >
                                <Text style={styles.addSubCategoryButtonText}>+</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => {
                                    setCategoryToDelete(category);
                                    setShowDeleteConfirmModal(true);
                                }}
                            >
                                <Text style={styles.deleteButtonText}>×</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
                {hasSubCategories && category.subCategories!.map(subCategory => 
                    renderCategoryItem(subCategory, level + 1)
                )}
            </View>
        );
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <BackButton path='/products/product' />
                <Text style={styles.headerTitle}>Thêm sản phẩm mới</Text>
            </View>

            <View style={styles.formContainer}>
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                    
                    <Text style={styles.label}>Tên sản phẩm <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={productName}
                        onChangeText={setProductName}
                        placeholder="Nhập tên sản phẩm"
                    />

                    <Text style={styles.label}>Giá <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={price}
                        onChangeText={setPrice}
                        placeholder="Nhập giá sản phẩm"
                        keyboardType="numeric"
                    />

                    <Text style={styles.label}>Số lượng trong kho <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={stock}
                        onChangeText={setStock}
                        placeholder="Nhập số lượng"
                        keyboardType="numeric"
                    />

                    <Text style={styles.label}>Trạng thái</Text>
                </View>

                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Hình ảnh sản phẩm</Text>
                    <View style={styles.imagesContainer}>
                        {images.map((uri, index) => (
                            <View key={index} style={styles.imageWrapper}>
                                <TouchableOpacity onPress={() => openImageModal(uri, index)}>
                                    <Image source={getImageSource(uri)} style={styles.imagePreview} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.removeImageButton}
                                    onPress={() => removeImage(index)}
                                >
                                    <Text style={styles.removeImageButtonText}>×</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                            <Text style={styles.addImageButtonText}>+</Text>
                            <Text style={styles.addImageButtonSubtext}>Thêm ảnh</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Danh mục</Text>
                    <TouchableOpacity
                        style={styles.categoryButton}
                        onPress={() => setShowCategoryModal(true)}
                    >
                        <Text style={styles.categoryButtonText}>
                            {selectedCategories.length > 0
                                ? getSelectedCategoryNames()
                                : 'Chọn danh mục sản phẩm'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Mô tả</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Nhập mô tả sản phẩm"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    <Text style={styles.submitButtonText}>
                        {isSubmitting ? 'Đang xử lý...' : 'Thêm sản phẩm'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Modal hiển thị hình ảnh */}
            <Modal
                visible={!!selectedImage}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.imageModalContent}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setSelectedImage(null)}
                        >
                            <Text style={styles.closeButtonText}>×</Text>
                        </TouchableOpacity>
                        {selectedImage && (
                            <Image
                                source={getImageSource(selectedImage)}
                                style={styles.modalImage}
                                resizeMode="contain"
                            />
                        )}
                        {images.length > 1 && (
                            <View style={styles.imageNavigationButtons}>
                                <TouchableOpacity
                                    style={styles.navButton}
                                    onPress={() => navigateImage('left')}
                                >
                                    <Text style={styles.navButtonText}>←</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.navButton}
                                    onPress={() => navigateImage('right')}
                                >
                                    <Text style={styles.navButtonText}>→</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Modal quản lý danh mục */}
            <Modal
                visible={showCategoryModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCategoryModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Quản lý danh mục</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowCategoryModal(false)}
                            >
                                <Text style={styles.closeButtonText}>×</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity
                            style={styles.addCategoryButton}
                            onPress={() => {
                                setSelectedParentCategory(null);
                                setShowAddCategoryModal(true);
                            }}
                        >
                            <Text style={styles.addCategoryButtonText}>+ Thêm danh mục gốc</Text>
                        </TouchableOpacity>
                        
                        <ScrollView style={styles.categoryList}>
                            {categories.map(category => renderCategoryItem(category))}
                        </ScrollView>
                        
                        <TouchableOpacity
                            style={styles.saveCategoriesButton}
                            onPress={() => setShowCategoryModal(false)}
                        >
                            <Text style={styles.saveCategoriesButtonText}>Lưu lựa chọn</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal thêm danh mục */}
            <Modal
                visible={showAddCategoryModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAddCategoryModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {selectedParentCategory ? "Thêm danh mục con" : "Thêm danh mục mới"}
                            </Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowAddCategoryModal(false)}
                            >
                                <Text style={styles.closeButtonText}>×</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.label}>Tên danh mục</Text>
                        <TextInput
                            style={styles.input}
                            value={newCategoryName}
                            onChangeText={setNewCategoryName}
                            placeholder="Nhập tên danh mục"
                        />
                        
                        {selectedParentCategory && (
                            <View style={styles.selectedParentInfo}>
                                <Text style={styles.selectedParentLabel}>Danh mục cha:</Text>
                                <Text style={styles.selectedParentName}>
                                    {findCategoryById(categories, selectedParentCategory)?.name || ''}
                                </Text>
                            </View>
                        )}
                        
                        <TouchableOpacity
                            style={styles.addCategoryConfirmButton}
                            onPress={handleAddCategory}
                        >
                            <Text style={styles.addCategoryConfirmButtonText}>Thêm danh mục</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal xác nhận xóa danh mục */}
            <Modal
                visible={showDeleteConfirmModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDeleteConfirmModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.deleteModalContent}>
                        <Text style={styles.modalTitle}>Xác nhận xóa</Text>
                        <Text style={styles.deleteModalMessage}>
                            Bạn có chắc chắn muốn xóa danh mục "{categoryToDelete?.name}"?
                            {categoryToDelete?.subCategories && categoryToDelete.subCategories.length > 0 &&
                                " Tất cả danh mục con cũng sẽ bị xóa."
                            }
                        </Text>
                        <View style={styles.deleteModalActions}>
                            <TouchableOpacity
                                style={styles.cancelDeleteButton}
                                onPress={() => setShowDeleteConfirmModal(false)}
                            >
                                <Text style={styles.cancelDeleteButtonText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmDeleteButton}
                                onPress={() => {
                                    if (categoryToDelete) {
                                        handleDeleteCategory(categoryToDelete);
                                        setShowDeleteConfirmModal(false);
                                    }
                                }}
                            >
                                <Text style={styles.confirmDeleteButtonText}>Xóa</Text>
                            </TouchableOpacity>
                        </View>
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
                        <Text style={styles.successText}>Thêm sản phẩm thành công!</Text>
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
        color: '#2c3e50',
        marginBottom: 8,
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
        height: 120,
        textAlignVertical: 'top',
    },
    statusContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statusButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        marginHorizontal: 5,
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
        color: '#2c3e50',
    },
    statusButtonTextActive: {
        color: '#fff',
    },
    statusButtonTextInactive: {
        color: '#fff',
    },
    imagesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 15,
    },
    imageWrapper: {
        width: 100,
        height: 100,
        marginRight: 10,
        marginBottom: 10,
        position: 'relative',
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: -10,
        right: -10,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#e74c3c',
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeImageButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    addImageButton: {
        width: 100,
        height: 100,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addImageButtonText: {
        fontSize: 24,
        color: '#3498db',
    },
    addImageButtonSubtext: {
        fontSize: 12,
        color: '#7f8c8d',
    },
    categoryButton: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
    },
    categoryButtonText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    submitButton: {
        backgroundColor: '#2ecc71',
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    disabledButton: {
        backgroundColor: '#95a5a6',
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
        width: '90%',
        maxWidth: 600,
        maxHeight: '80%',
        padding: 20,
    },
    imageModalContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        width: '90%',
        maxWidth: 800,
        maxHeight: '90%',
        padding: 10,
        position: 'relative',
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
    modalImage: {
        width: '100%',
        height: 400,
    },
    imageNavigationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    navButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    navButtonText: {
        color: '#fff',
        fontSize: 24,
    },
    categoryList: {
        maxHeight: 400,
        marginBottom: 15,
    },
    categoryItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    categoryItemContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryItemText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    selectedCategory: {
        backgroundColor: '#e1f5fe',
    },
    selectedCategoryText: {
        color: '#0288d1',
        fontWeight: 'bold',
    },
    categoryItemActions: {
        flexDirection: 'row',
    },
    addSubCategoryButton: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#3498db',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 5,
    },
    addSubCategoryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    deleteButton: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#e74c3c',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    addCategoryButton: {
        backgroundColor: '#3498db',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 15,
    },
    addCategoryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    saveCategoriesButton: {
        backgroundColor: '#2ecc71',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveCategoriesButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    selectedParentInfo: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
    },
    selectedParentLabel: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    selectedParentName: {
        fontSize: 16,
        color: '#2c3e50',
        fontWeight: 'bold',
    },
    addCategoryConfirmButton: {
        backgroundColor: '#2ecc71',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    addCategoryConfirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    deleteModalContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        width: '90%',
        maxWidth: 500,
        padding: 20,
    },
    deleteModalMessage: {
        fontSize: 16,
        color: '#2c3e50',
        marginBottom: 20,
        lineHeight: 24,
    },
    deleteModalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    cancelDeleteButton: {
        backgroundColor: '#95a5a6',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginRight: 10,
    },
    cancelDeleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    confirmDeleteButton: {
        backgroundColor: '#e74c3c',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
    },
    confirmDeleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
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
        fontWeight: 'bold',
    },
});