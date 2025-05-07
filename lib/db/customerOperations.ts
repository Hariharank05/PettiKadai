// ~/lib/db/customerOperations.ts
import { getDatabase } from './database';
import { v4 as uuidv4 } from 'uuid';
import { Customer } from './types';

const db = getDatabase();

export const addCustomer = async (
  customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchases' | 'outstandingBalance' | 'loyaltyPoints' | 'lastPurchaseDate'>
): Promise<Customer> => {
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  
  // Ensure all fields for Customer are present, with defaults for non-provided ones
  const newCustomer: Customer = {
    id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email || null,
    address: customer.address || null,
    creditLimit: customer.creditLimit || 0,
    totalPurchases: 0,
    outstandingBalance: 0,
    loyaltyPoints: 0,
    lastPurchaseDate: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  try {
    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM Customers WHERE phone = ?',
      [newCustomer.phone]
    );
    if (existing) {
      throw new Error('Phone number already exists.');
    }

    await db.runAsync(
      `
      INSERT INTO Customers (
        id, name, phone, email, address, totalPurchases, 
        outstandingBalance, creditLimit, loyaltyPoints, lastPurchaseDate, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        newCustomer.id,
        newCustomer.name,
        newCustomer.phone,
        newCustomer.email ?? null, // Ensure null for undefined
        newCustomer.address ?? null, // Ensure null for undefined
        newCustomer.totalPurchases,
        newCustomer.outstandingBalance,
        newCustomer.creditLimit,
        newCustomer.loyaltyPoints,
        newCustomer.lastPurchaseDate ?? null, // Ensure null for undefined
        newCustomer.createdAt,
        newCustomer.updatedAt,
      ]
    );
    return newCustomer;
  } catch (error: any) {
    if (error.message.includes('Phone number already exists.')) {
        throw error;
    }
    // Check for SQLite specific unique constraint error
    if (error.message.includes('SQLITE_CONSTRAINT') && error.message.includes('UNIQUE constraint failed: Customers.phone')) {
      throw new Error('Phone number already exists.');
    }
    console.error('Error adding customer to DB:', error.message);
    throw new Error('Failed to add customer. Please try again.');
  }
};

export const getAllCustomers = async (): Promise<Customer[]> => {
  try {
    const rows = await db.getAllAsync<Customer>('SELECT * FROM Customers ORDER BY name');
    // Ensure numeric fields are numbers and isActive-like fields are booleans if they exist
    return rows.map(row => ({
        ...row,
        totalPurchases: Number(row.totalPurchases) || 0,
        outstandingBalance: Number(row.outstandingBalance) || 0,
        creditLimit: Number(row.creditLimit) || 0,
        loyaltyPoints: Number(row.loyaltyPoints) || 0,
    }));
  } catch (error: any) {
    console.error('Error fetching customers from DB:', error.message);
    throw new Error('Failed to fetch customers.');
  }
};

export const updateCustomer = async (
  id: string,
  updates: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchases' | 'outstandingBalance' | 'loyaltyPoints' | 'lastPurchaseDate'>>
): Promise<Customer> => {
  const timestamp = new Date().toISOString();
  try {
    // Check for phone uniqueness if phone is being updated
    if (updates.phone) {
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM Customers WHERE phone = ? AND id != ?',
        [updates.phone, id]
      );
      if (existing) {
        throw new Error('Phone number already exists for another customer.');
      }
    }

    // Build the SET part of the SQL query dynamically
    const updateEntries = Object.entries(updates).filter(([_, value]) => value !== undefined);
    if (updateEntries.length === 0) {
      // No actual updates to perform, fetch and return current customer
      const currentCustomer = await db.getFirstAsync<Customer>('SELECT * FROM Customers WHERE id = ?', [id]);
      if (!currentCustomer) throw new Error('Customer not found.');
      return currentCustomer;
    }

    const fields = updateEntries.map(([key]) => `${key} = ?`).join(', ');
    const values = updateEntries.map(([_, value]) => value);

    await db.runAsync(`UPDATE Customers SET ${fields}, updatedAt = ? WHERE id = ?`, [...values, timestamp, id]);

    const updatedCustomer = await db.getFirstAsync<Customer>('SELECT * FROM Customers WHERE id = ?', [id]);
    if (!updatedCustomer) throw new Error('Customer not found after update.');
    return {
        ...updatedCustomer,
        totalPurchases: Number(updatedCustomer.totalPurchases) || 0,
        outstandingBalance: Number(updatedCustomer.outstandingBalance) || 0,
        creditLimit: Number(updatedCustomer.creditLimit) || 0,
        loyaltyPoints: Number(updatedCustomer.loyaltyPoints) || 0,
    };
  } catch (error: any) {
    if (error.message.includes('Phone number already exists')) {
        throw error;
    }
    if (error.message.includes('SQLITE_CONSTRAINT') && error.message.includes('Customers.phone')) {
        throw new Error('Phone number already exists for another customer.');
    }
    console.error('Error updating customer in DB:', error.message);
    throw new Error('Failed to update customer.');
  }
};

export const deleteCustomer = async (id: string): Promise<void> => {
  try {
    await db.runAsync('DELETE FROM Customers WHERE id = ?', [id]);
  } catch (error: any) {
    console.error('Error deleting customer from DB:', error.message);
    throw new Error('Failed to delete customer.');
  }
};