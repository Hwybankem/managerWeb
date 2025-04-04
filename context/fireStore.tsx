import { createContext, useContext, useState } from 'react';
import { 
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  DocumentData
} from 'firebase/firestore';
import { app,db } from '../config/firebaseConfig';

interface FirestoreContextType {
  // Thêm document mới
  addDocument: (collectionName: string, data: any) => Promise<string>;
  // Lấy tất cả documents từ collection
  getDocuments: (collectionName: string) => Promise<DocumentData[]>;
  // Lấy một document theo ID
  getDocument: (collectionName: string, docId: string) => Promise<DocumentData | null>;
  // Cập nhật document
  updateDocument: (collectionName: string, docId: string, data: any) => Promise<void>;
  // Xóa document
  deleteDocument: (collectionName: string, docId: string) => Promise<void>;
  // Query documents với điều kiện
  queryDocuments: (collectionName: string, field: string, operator: any, value: any) => Promise<DocumentData[]>;
  loading: boolean;
  error: string | null;
}

const FirestoreContext = createContext<FirestoreContextType | null>(null);

export const FirestoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const db = getFirestore(app);

  const addDocument = async (collectionName: string, data: any): Promise<string> => {
    try {
      setLoading(true);
      setError(null);
      const docRef = await addDoc(collection(db, collectionName), data);
      return docRef.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi thêm document');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getDocuments = async (collectionName: string): Promise<DocumentData[]> => {
    try {
      setLoading(true);
      setError(null);
      const querySnapshot = await getDocs(collection(db, collectionName));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lấy documents');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getDocument = async (collectionName: string, docId: string): Promise<DocumentData | null> => {
    try {
      setLoading(true);
      setError(null);
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lấy document');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateDocument = async (collectionName: string, docId: string, data: any): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi cập nhật document');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (collectionName: string, docId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi xóa document');
      throw err;
    } finally {
      setLoading(false);
    }
  };


  const queryDocuments = async (collectionName: string, field: string, operator: any, value: any): Promise<DocumentData[]> => {
    try {
      setLoading(true);
      setError(null);
      const q = query(collection(db, collectionName), where(field, operator, value));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi query documents');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    addDocument,
    getDocuments,
    getDocument,
    updateDocument,
    deleteDocument,
    queryDocuments,
    loading,
    error
  };

  return (
    <FirestoreContext.Provider value={value}>
      {children}
    </FirestoreContext.Provider>
  );
};

export const useFirestore = () => {
  const context = useContext(FirestoreContext);
  if (!context) {
    throw new Error('useFirestore phải được sử dụng trong FirestoreProvider');
  }
  return context;
};
