// app/products/types.ts
export interface Category {
    id: string;
    name: string;
    parentId?: string;
    parentName?: string;
    subCategories?: Category[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Product {
    id?: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    images: string[];
    categories: string[];
    status?: 'active' | 'inactive';
    createdAt?: Date;
    updatedAt?: Date;
}