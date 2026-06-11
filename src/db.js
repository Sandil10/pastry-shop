import Dexie from 'dexie';

export const db = new Dexie('pos_database');

// Upgraded version to include cashiers management
db.version(3).stores({
  pos_products: '++id, name, price, stock', 
  sales: '++id, date, total, cashier',
  shifts: '++id, closedAt, cashier',
  settings: 'id', // 'global' will be the key
  returns: '++id, saleId, date, total',
  cashiers: '++id, name'
});
