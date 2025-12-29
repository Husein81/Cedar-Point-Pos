export type UnsubscribeFunction = () => void;
export type FrameWindowAction = "CLOSE" | "MAXIMIZE" | "MINIMIZE";

export interface Order {
  id: string;
  customerName: string;
  total: number;
  status: 'pending' | 'completed';
  createdAt: string;
  // Add other fields as necessary
}

export interface Product {
    id: string;
    name: string;
    price: number;
    categoryId?: string;
    description?: string;
    sku?: string;
    stockQuantity: number;
    imageUrl?: string;
}

export interface Category {
    id: string;
    name: string;
    description?: string;
}

export interface Tax {
    id: string;
    name: string;
    rate: number;
}

export type SyncStatus = 'IDLE' | 'SYNCING' | 'OFFLINE' | 'ERROR';

export interface IpcApi {
  orders: {
    list: () => Promise<Order[]>;
    create: (order: Omit<Order, 'id' | 'createdAt'>) => Promise<Order>;
    update: (id: string, updates: Partial<Order>) => Promise<Order>;
  };
  products: {
    list: () => Promise<Product[]>;
    search: (query: string) => Promise<Product[]>;
    getByCategory: (categoryId: string) => Promise<Product[]>;
  };
  categories: {
    list: () => Promise<Category[]>;
  };
  sync: {
    getStatus: () => Promise<SyncStatus>;
    retry: () => Promise<void>;
    onStatusChange: (callback: (status: SyncStatus) => void) => UnsubscribeFunction;
  };
}

declare global { // Ensure global augmentation
  interface Window {
    electron: {
      sendFrameAction: (payload: FrameWindowAction) => void;
    };
    api: IpcApi;
  }
}
