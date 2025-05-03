// import { create } from 'zustand';
// import { getDatabase } from '~/lib/db/database';

// // Update Product interface to match actual database schema
// interface Product {
//   id: string;
//   name: string;
//   costPrice: number;
//   sellingPrice: number;
//   quantity: number;
//   unit?: string;
//   category?: string | null;
//   imageUri?: string | null;
//   barcode?: string | null;
//   isActive?: number;
//   minStockLevel?: number;
//   tax_percentage?: number;
//   createdAt: string;
//   updatedAt: string;
// }

// interface ProductStore {
//   products: Product[];
//   fetchProducts: () => Promise<void>;
//   addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
//   updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
//   deleteProduct: (id: string) => Promise<void>;
//   setProducts: (products: Product[]) => void;
// }

// // Custom ID generator (timestamp + random string)
// const generateId = () => {
//   return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
// };

// export const useProductStore = create<ProductStore>((set) => ({
//   products: [],

//   fetchProducts: async () => {
//     const db = getDatabase();
//     try {
//       const result = db.getAllSync<Product>('SELECT * FROM products;');
//       console.log('Fetched products:', result);
//       set({ products: result });
//     } catch (error) {
//       console.error('Error fetching products:', error);
//       throw error;
//     }
//   },

//   addProduct: async (product) => {
//     const db = getDatabase();
//     const id = generateId();
//     const createdAt = new Date().toISOString();
//     const updatedAt = createdAt;
//     try {
//       db.runSync(
//         `INSERT INTO products (id, name, costPrice, sellingPrice, quantity, unit, category, imageUri, barcode, isActive, minStockLevel, tax_percentage, createdAt, updatedAt)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
//         [
//           id,
//           product.name,
//           product.costPrice,
//           product.sellingPrice,
//           product.quantity || 0,
//           product.unit || 'piece',
//           product.category || null,
//           product.imageUri || null,
//           product.barcode || null,
//           product.isActive || 0,
//           product.minStockLevel || null,
//           product.tax_percentage || 0,
//           createdAt,
//           updatedAt,
//         ]
//       );
//       set((state) => ({
//         products: [
//           ...state.products,
//           { ...product, id, createdAt, updatedAt },
//         ],
//       }));
//     } catch (error) {
//       console.error('Error adding product:', error);
//       throw error;
//     }
//   },

//   updateProduct: async (id, updates) => {
//     const db = getDatabase();
//     const updatedAt = new Date().toISOString();
//     try {
//       db.runSync(
//         `UPDATE products
//          SET name = ?, costPrice = ?, sellingPrice = ?, quantity = ?, unit = ?, category = ?, imageUri = ?, barcode = ?, isActive = ?, minStockLevel = ?, tax_percentage = ?, updatedAt = ?
//          WHERE id = ?;`,
//         [
//           updates.name || null,
//           updates.costPrice || 0,
//           updates.sellingPrice || 0,
//           updates.quantity || 0,
//           updates.unit || 'piece',
//           updates.category || null,
//           updates.imageUri || null,
//           updates.barcode || null,
//           updates.isActive || 0,
//           updates.minStockLevel || null,
//           updates.tax_percentage || 0,
//           updatedAt,
//           id,
//         ]
//       );
//       set((state) => ({
//         products: state.products.map((p) =>
//           p.id === id ? { ...p, ...updates, updatedAt } : p
//         ),
//       }));
//     } catch (error) {
//       console.error('Error updating product:', error);
//       throw error;
//     }
//   },

//   deleteProduct: async (id) => {
//     const db = getDatabase();
//     try {
//       db.runSync('DELETE FROM products WHERE id = ?;', [id]);
//       set((state) => ({
//         products: state.products.filter((p) => p.id !== id),
//       }));
//     } catch (error) {
//       console.error('Error deleting product:', error);
//       throw error;
//     }
//   },

//   setProducts: (products) => set({ products }),
// }));