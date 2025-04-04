import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    Image,
    SafeAreaView,
    Platform,
    Modal,
    Button,
} from 'react-native';

// ProductItem.js
export default function ProductItem({ item, onPress }) {
    return (
      <View style={styles.productItem}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>${item.price}</Text>
        <TouchableOpacity style={styles.detailButton} onPress={() => onPress(item)}>
          <Text style={styles.detailButtonText}>Xem chi tiết</Text>
        </TouchableOpacity>
      </View>
    );
  }
  

const styles = StyleSheet.create({
    productItem: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 10,
        margin: 5,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        minWidth: Platform.OS === 'web' ? '24%' : '45%',
        maxWidth: Platform.OS === 'web' ? '24%' : '45%',
    },
    productImage: {
        width: '100%',
        height: 150,
        resizeMode: 'cover',
        marginBottom: 8,
        borderRadius: 4,
    },
    productName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    productPrice: {
        fontSize: 16,
        color: '#e44d26',
        fontWeight: 'bold',
    },
    detailButton: {
        backgroundColor: '#28a745',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 5,
        marginTop: 8,
    },
    detailButtonText: {
        color: '#fff',
        textAlign: 'center',
    },
});
