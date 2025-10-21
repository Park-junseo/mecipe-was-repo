import { Prisma, Product, ProductCategory, ProductImage } from "prisma/basic";

// 타입 정의
export type CategoryTree = {
    id: number;
    name: string;
    code: string;
    description: string | null;
    children: CategoryTree[];
    descendantIds: number[];
};

export type PublicProduct = {
    products: (Product & {
        ProductCategory: ProductCategory;
        ProductImages: ProductImage[];
    })[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    categoryTree: CategoryTree[];
};
