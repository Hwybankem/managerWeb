// hooks/useCategories.ts
import { useState, useEffect } from 'react';
import { useFirestore } from '../context/storageFirebase';

interface Category {
  id: string;
  name: string;
  parentId?: string;
  subCategories?: Category[];
}

export const useCategories = () => {
  const { getDocuments } = useFirestore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const categoriesData = await getDocuments('categories');
        const categoryMap = new Map<string, Category>();
        const rootCategories: Category[] = [];

        categoriesData.forEach((category: any) => {
          categoryMap.set(category.id, {
            id: category.id,
            name: category.name,
            parentId: category.parentId,
            subCategories: [],
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
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [getDocuments]);

  return { categories, loading, error };
};