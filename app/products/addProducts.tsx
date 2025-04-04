import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Dimensions,
    Modal,
    Alert,
    Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFirestore } from '../../context/storageFirebase';
import { uploadToImgBB } from '../../services/imgbbService';

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
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedParentCategory, setSelectedParentCategory] = useState<string | null>(null);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [showParentCategoryList, setShowParentCategoryList] = useState(false);
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
                status: status,
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
        setStatus('active');
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
        <ScrollView style={[styles.container, { alignItems: undefined }]} contentContainerStyle={{ alignItems: 'center' }}>
            <Text style={styles.title}>Quản lý Sản phẩm</Text>

            <View style={styles.formContainer}>
                <Text style={styles.label}>Product Name:</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter product name"
                    value={productName}
                    onChangeText={setProductName}
                />

                <Text style={styles.label}>Description:</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter product description"
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                />

                <Text style={styles.label}>Categories:</Text>
                <TouchableOpacity 
                    style={styles.categoryButton}
                    onPress={() => setShowCategoryModal(true)}
                >
                    <Text style={styles.categoryButtonText}>
                        {selectedCategories.length > 0 
                            ? getSelectedCategoryNames() 
                            : 'Select Categories'}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.label}>Price:</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter product price"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                />

                <Text style={styles.label}>Stock Quantity:</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter stock quantity"
                    keyboardType="number-pad"
                    value={stock}
                    onChangeText={setStock}
                />

                <Text style={styles.label}>Status:</Text>
                <View style={styles.statusContainer}>
                    <TouchableOpacity 
                        style={[
                            styles.statusButton,
                            status === 'active' && styles.statusButtonActive
                        ]}
                        onPress={() => setStatus('active')}
                    >
                        <Text style={[
                            styles.statusButtonText,
                            status === 'active' && styles.statusButtonTextActive
                        ]}>
                            Active
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[
                            styles.statusButton,
                            status === 'inactive' && styles.statusButtonInactive
                        ]}
                        onPress={() => setStatus('inactive')}
                    >
                        <Text style={[
                            styles.statusButtonText,
                            status === 'inactive' && styles.statusButtonTextInactive
                        ]}>
                            Inactive
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.label}>Product Images:</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={pickImage}> 
                    <Text style={styles.uploadButtonText}>Upload Product Image</Text>   
                </TouchableOpacity>
                
                <View style={styles.imageGrid}>
                    {images.map((uri, index) => (
                        <View key={index} style={styles.imageContainer}>
                            <Image 
                                source={getImageSource(uri)} 
                                style={styles.imagePreview}
                            />
                            <TouchableOpacity 
                                style={styles.imageOverlay}
                                onPress={() => openImageModal(uri, index)}
                            />
                            <TouchableOpacity 
                                style={styles.removeButton}
                                onPress={() => removeImage(index)}
                            >
                                <Text style={styles.removeButtonText}>×</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                <TouchableOpacity 
                    style={[styles.submitButton, (isSubmitting || firestoreLoading) && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting || firestoreLoading}
                >
                    <Text style={styles.submitButtonText}>
                        {isSubmitting || firestoreLoading ? 'Đang xử lý...' : 'Thêm mới'}
                    </Text>
                </TouchableOpacity>
            </View>

            <Modal
                visible={showCategoryModal}
                transparent={true}
                onRequestClose={() => setShowCategoryModal(false)}
            >
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
                            {categories.map(category => 
                                renderCategoryItem(category)
                            )}
                        </ScrollView>
                        <TouchableOpacity 
                            style={styles.addCategoryButton}
                            onPress={() => setShowAddCategoryModal(true)}
                        >
                            <Text style={styles.addCategoryButtonText}>+ Thêm Danh mục</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={selectedImage !== null}
                transparent={true}
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={styles.modalContainer}>
                    <TouchableOpacity 
                        style={styles.navigationButton}
                        onPress={() => navigateImage('left')}
                    >
                        <Text style={styles.navigationButtonText}>❮</Text>
                    </TouchableOpacity>

                    <Image 
                        source={{ uri: selectedImage || '' }} 
                        style={styles.modalImage}
                        resizeMode="contain"
                    />

                    <TouchableOpacity 
                        style={[styles.navigationButton, styles.navigationButtonRight]}
                        onPress={() => navigateImage('right')}
                    >
                        <Text style={styles.navigationButtonText}>❯</Text>
                    </TouchableOpacity>

                    <View style={styles.modalBottomContainer}>
                        <Text style={styles.imageCounter}>
                            {currentImageIndex + 1} / {images.length}
                        </Text>
                        <TouchableOpacity 
                            style={styles.exitButton}
                            onPress={() => setSelectedImage(null)}
                        >
                            <Text style={styles.exitButtonText}>Thoát</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showAddCategoryModal}
                transparent={true}
                onRequestClose={() => setShowAddCategoryModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.categoryModalContent}>
                        <View style={styles.categoryModalHeader}>
                            <Text style={styles.categoryModalTitle}>
                                {selectedParentCategory ? 'Thêm Danh mục Con' : 'Thêm Danh mục Mới'}
                            </Text>
                            <TouchableOpacity 
                                onPress={() => {
                                    setShowAddCategoryModal(false);
                                    setSelectedParentCategory(null);
                                }}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseButtonText}>×</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.label}>Tên danh mục:</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nhập tên danh mục"
                            value={newCategoryName}
                            onChangeText={setNewCategoryName}
                        />
                        <Text style={styles.label}>Danh mục cha (nếu có):</Text>
                        <View style={styles.parentCategoryContainer}>
                            <TouchableOpacity 
                                style={styles.categoryButton}
                                onPress={() => setShowParentCategoryList(!showParentCategoryList)}
                            >
                                <Text style={styles.categoryButtonText}>
                                    {selectedParentCategory 
                                        ? categories.find(cat => cat.id === selectedParentCategory)?.name 
                                        : 'Chọn danh mục cha'}
                                </Text>
                                <Text style={styles.dropdownIcon}>{showParentCategoryList ? '▼' : '▶'}</Text>
                            </TouchableOpacity>
                            {showParentCategoryList && (
                                <View style={styles.parentCategoryList}>
                                    <TouchableOpacity
                                        style={[
                                            styles.parentCategoryItem,
                                            !selectedParentCategory && styles.selectedParentCategory
                                        ]}
                                        onPress={() => {
                                            setSelectedParentCategory(null);
                                            setShowParentCategoryList(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.parentCategoryText,
                                            !selectedParentCategory && styles.selectedParentCategoryText
                                        ]}>
                                            Không có danh mục cha
                                        </Text>
                                    </TouchableOpacity>
                                    {categories.map(category => (
                                        <TouchableOpacity
                                            key={category.id}
                                            style={[
                                                styles.parentCategoryItem,
                                                selectedParentCategory === category.id && styles.selectedParentCategory
                                            ]}
                                            onPress={() => {
                                                setSelectedParentCategory(category.id);
                                                setShowParentCategoryList(false);
                                            }}
                                        >
                                            <Text style={[
                                                styles.parentCategoryText,
                                                selectedParentCategory === category.id && styles.selectedParentCategoryText
                                            ]}>
                                                {category.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                        <TouchableOpacity 
                            style={styles.submitButton}
                            onPress={handleAddCategory}
                        >
                            <Text style={styles.submitButtonText}>Thêm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showDeleteConfirmModal}
                transparent={true}
                onRequestClose={() => setShowDeleteConfirmModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.categoryModalContent}>
                        <View style={styles.categoryModalHeader}>
                            <Text style={styles.categoryModalTitle}>Xác nhận xóa</Text>
                            <TouchableOpacity 
                                onPress={() => setShowDeleteConfirmModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseButtonText}>×</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.confirmText}>
                            Bạn có chắc chắn muốn xóa danh mục "{categoryToDelete?.name}"?
                        </Text>
                        <View style={styles.confirmButtons}>
                            <TouchableOpacity 
                                style={[styles.confirmButton, styles.cancelButton]}
                                onPress={() => setShowDeleteConfirmModal(false)}
                            >
                                <Text style={styles.confirmButtonText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.confirmButton, styles.confirmDeleteButton]}
                                onPress={() => {
                                    if (categoryToDelete) {
                                        handleDeleteCategory(categoryToDelete);
                                        setShowDeleteConfirmModal(false);
                                    }
                                }}
                            >
                                <Text style={styles.confirmButtonText}>Xóa</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showSuccessModal}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.successModalContent}>
                        <Text style={styles.successIcon}>✓</Text>
                        <Text style={styles.successText}>Thêm sản phẩm thành công!</Text>
                        <Text style={styles.successSubText}>Đóng sau 2 giây</Text>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showErrorModal}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.errorModalContent}>
                        <Text style={styles.errorIcon}>✕</Text>
                        <Text style={styles.errorText}>Có lỗi xảy ra!</Text>
                        <Text style={styles.errorMessage}>{errorMessage}</Text>
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
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#2c3e50',
    },
    formContainer: {
        width: '100%',
        maxWidth: 800,
        backgroundColor: '#fff',
        padding: 30,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 3,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#2c3e50',
    },
    input: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: '#fff',
        color: '#2c3e50',
    },
    uploadButton: {
        backgroundColor: '#3498db',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: '#2ecc71',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
        marginTop: 15,
    },
    imageContainer: {
        position: 'relative',
        width: '48%',
    },
    imagePreview: {
        width: '100%',
        height: 180,
        borderRadius: 10,
        backgroundColor: '#f8f9fa',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 10,
    },
    removeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(231, 76, 60, 0.8)',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseButton: {
        position: 'absolute',
        right: 20,
        zIndex: 2,
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
    navigationButton: {
        position: 'absolute',
        top: '50%',
        left: 20,
        transform: [{ translateY: -20 }],
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    navigationButtonRight: {
        left: 'auto',
        right: 20,
    },
    navigationButtonText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    modalImage: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height * 0.8,
    },
    modalBottomContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 2,
    },
    imageCounter: {
        color: '#fff',
        fontSize: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    exitButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    exitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    categoryButton: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryButtonText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    categoryModalContent: {
        backgroundColor: '#fff',
        borderRadius: 15,
        width: '90%',
        maxHeight: '80%',
        padding: 25,
        marginTop: 0,
        position: 'absolute',
        top: 100,
        left: '5%',
        display: 'flex',
        flexDirection: 'column',
    },
    categoryModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    categoryModalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    categoryList: {
        flex: 1,
        maxHeight: 500,
        marginBottom: 20,
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
    categoryItemContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryItemActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    deleteButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(231, 76, 60, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    confirmText: {
        fontSize: 16,
        color: '#2c3e50',
        marginBottom: 20,
    },
    confirmButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    confirmButton: {
        padding: 12,
        borderRadius: 10,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#95a5a6',
    },
    confirmDeleteButton: {
        backgroundColor: '#e74c3c',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    addSubCategoryButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#2ecc71',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 5,
    },
    addSubCategoryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    addCategoryButton: {
        backgroundColor: '#2ecc71',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 'auto',
    },
    addCategoryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dropdownIcon: {
        fontSize: 12,
        color: '#7f8c8d',
    },
    parentCategoryContainer: {
        position: 'relative',
        zIndex: 1000,
    },
    parentCategoryList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        backgroundColor: '#fff',
        maxHeight: 200,
        marginTop: 5,
    },
    parentCategoryItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedParentCategory: {
        backgroundColor: '#3498db',
    },
    parentCategoryText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    selectedParentCategoryText: {
        color: '#fff',
    },
    submitButtonDisabled: {
        backgroundColor: '#95a5a6',
    },
    successModalContent: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        width: '80%',
        maxWidth: 300,
    },
    successIcon: {
        fontSize: 50,
        color: '#2ecc71',
        marginBottom: 20,
    },
    successText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 10,
    },
    successSubText: {
        fontSize: 16,
        color: '#7f8c8d',
    },
    errorModalContent: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        width: '80%',
        maxWidth: 300,
    },
    errorIcon: {
        fontSize: 50,
        color: '#e74c3c',
        marginBottom: 20,
    },
    errorText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 10,
    },
    errorMessage: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
        marginBottom: 20,
    },
    errorButton: {
        backgroundColor: '#e74c3c',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    errorButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    statusContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    statusButton: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
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
        color: '#2c3e50',
    },
    statusButtonTextActive: {
        color: '#fff',
    },
    statusButtonTextInactive: {
        color: '#fff',
    },
});