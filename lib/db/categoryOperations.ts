import { Category } from '../stores/types';
import { getDatabase } from './database';
import { v4 as uuidv4 } from 'uuid';

const db = getDatabase();

export const addCategory = async (
  userId: string,
  category: Omit<Category, 'id' | 'userId' | 'createdAt'>
): Promise<Category> => {
  const id = uuidv4();
  const timestamp = new Date().toISOString();

  // Ensure all fields for Category are present, with defaults for non-provided ones
  const newCategory: Category = {
    id,
    userId,
    name: category.name,
    description: category.description || null,
    createdAt: timestamp,
  };

  try {
    // Check if category name already exists for this user
    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM Categories WHERE name = ? AND userId = ?',
      [newCategory.name, userId]
    );
    if (existing) {
      throw new Error('Category name already exists.');
    }

    await db.runAsync(
      `
      INSERT INTO Categories (
        id, userId, name, description, createdAt
      ) VALUES (?, ?, ?, ?, ?)
      `,
      [
        newCategory.id,
        newCategory.userId,
        newCategory.name,
        newCategory.description ?? null,
        newCategory.createdAt,
      ]
    );
    return newCategory;
  } catch (error: any) {
    if (error.message.includes('Category name already exists.')) {
      throw error;
    }
    // Check for SQLite specific unique constraint error (if a UNIQUE constraint is added later)
    if (error.message.includes('SQLITE_CONSTRAINT') && error.message.includes('UNIQUE constraint failed: Categories.name')) {
      throw new Error('Category name already exists.');
    }
    console.error('Error adding category to DB:', error.message);
    throw new Error('Failed to add category. Please try again.');
  }
};

export const getAllCategories = async (userId: string): Promise<Category[]> => {
  try {
    // Only get categories for the current user
    const rows = await db.getAllAsync<Category>(
      'SELECT * FROM Categories WHERE userId = ? ORDER BY name',
      [userId]
    );
    return rows;
  } catch (error: any) {
    console.error('Error fetching categories from DB:', error.message);
    throw new Error('Failed to fetch categories.');
  }
};

export const updateCategory = async (
  userId: string,
  id: string,
  updates: Partial<Omit<Category, 'id' | 'userId' | 'createdAt'>>
): Promise<Category> => {
  const timestamp = new Date().toISOString();
  try {
    // Verify the category belongs to this user first
    const categoryOwnership = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM Categories WHERE id = ? AND userId = ?',
      [id, userId]
    );

    if (!categoryOwnership) {
      throw new Error('Category not found or access denied.');
    }

    // Check for name uniqueness if name is being updated (within the same userId scope)
    if (updates.name) {
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM Categories WHERE name = ? AND id != ? AND userId = ?',
        [updates.name, id, userId]
      );
      if (existing) {
        throw new Error('Category name already exists for another category.');
      }
    }

    // Build the SET part of the SQL query dynamically
    const updateEntries = Object.entries(updates).filter(([_, value]) => value !== undefined);
    if (updateEntries.length === 0) {
      // No actual updates to perform, fetch and return current category
      const currentCategory = await db.getFirstAsync<Category>(
        'SELECT * FROM Categories WHERE id = ? AND userId = ?',
        [id, userId]
      );
      if (!currentCategory) throw new Error('Category not found.');
      return currentCategory;
    }

    const fields = updateEntries.map(([key]) => `${key} = ?`).join(', ');
    const values = updateEntries.map(([_, value]) => value);

    await db.runAsync(
      `UPDATE Categories SET ${fields}, createdAt = ? WHERE id = ? AND userId = ?`,
      [...values, timestamp, id, userId]
    );

    const updatedCategory = await db.getFirstAsync<Category>(
      'SELECT * FROM Categories WHERE id = ? AND userId = ?',
      [id, userId]
    );
    if (!updatedCategory) throw new Error('Category not found after update.');
    return updatedCategory;
  } catch (error: any) {
    if (error.message.includes('Category name already exists')) {
      throw error;
    }
    if (error.message.includes('SQLITE_CONSTRAINT') && error.message.includes('Categories.name')) {
      throw new Error('Category name already exists for another category.');
    }
    console.error('Error updating category in DB:', error.message);
    throw new Error('Failed to update category.');
  }
};

export const deleteCategory = async (userId: string, id: string): Promise<void> => {
  try {
    // Check if the category is associated with any products
    const associatedProducts = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM Products WHERE category = (SELECT name FROM Categories WHERE id = ? AND userId = ?)',
      [id, userId]
    );

    if (associatedProducts && associatedProducts.count > 0) {
      throw new Error('Cannot delete category because it is associated with one or more products.');
    }

    // Only delete if the category belongs to this user
    await db.runAsync(
      'DELETE FROM Categories WHERE id = ? AND userId = ?',
      [id, userId]
    );
  } catch (error: any) {
    if (error.message.includes('Cannot delete category')) {
      throw error;
    }
    console.error('Error deleting category from DB:', error.message);
    throw new Error('Failed to delete category.');
  }
};