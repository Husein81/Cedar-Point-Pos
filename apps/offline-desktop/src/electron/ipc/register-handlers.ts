// Composition root: wires repositories → services → validated IPC handlers.

import { z } from "zod";
import { getDatabase } from "../database/connection";
import { registerHandler } from "../core/ipc-registry";
import {
  CashMovementSchema,
  CategorySchema,
  CheckoutSchema,
  CloseShiftSchema,
  ColorSchema,
  CustomerSchema,
  HoldOrderSchema,
  IdSchema,
  ListCustomersSchema,
  ListOrdersSchema,
  ListProductsSchema,
  ListStockMovementsSchema,
  LoginSchema,
  OpenShiftSchema,
  ProductSchema,
  RefundSchema,
  StockAdjustmentSchema,
  StockPurchaseSchema,
  UpdateSettingsSchema,
  UpdateUserSchema,
  UserSchema,
} from "../../shared/schemas";
import { UserRepository } from "../repositories/user.repository";
import { CategoryRepository } from "../repositories/category.repository";
import { ColorRepository } from "../repositories/color.repository";
import { ProductRepository } from "../repositories/product.repository";
import { CustomerRepository } from "../repositories/customer.repository";
import { OrderRepository } from "../repositories/order.repository";
import { StockRepository } from "../repositories/stock.repository";
import { ShiftRepository } from "../repositories/shift.repository";
import { SettingsRepository } from "../repositories/settings.repository";
import { AuthService } from "../services/auth.service";
import { CatalogService } from "../services/catalog.service";
import { ColorsService } from "../services/colors.service";
import { CustomersService } from "../services/customers.service";
import { OrdersService } from "../services/orders.service";
import { InventoryService } from "../services/inventory.service";
import { ShiftsService } from "../services/shifts.service";
import { BackupService } from "../services/backup.service";
import { SessionContext } from "../services/session-context";
import { ConflictError } from "../core/errors";

const byId = z.object({ id: IdSchema });

export function registerIpcHandlers() {
  const db = getDatabase();

  // repositories
  const users = new UserRepository(db);
  const categories = new CategoryRepository(db);
  const colors = new ColorRepository(db);
  const products = new ProductRepository(db);
  const customers = new CustomerRepository(db);
  const orders = new OrderRepository(db);
  const stock = new StockRepository(db);
  const shifts = new ShiftRepository(db);
  const settings = new SettingsRepository(db);

  // services
  const session = new SessionContext();
  const authService = new AuthService(users);
  const catalogService = new CatalogService(categories, products);
  const colorsService = new ColorsService(colors);
  const customersService = new CustomersService(customers);
  const ordersService = new OrdersService(
    db,
    orders,
    products,
    stock,
    shifts,
    settings,
    session,
  );
  const inventoryService = new InventoryService(db, products, stock, session);
  const shiftsService = new ShiftsService(shifts, session);
  const backupService = new BackupService();

  // ── auth ────────────────────────────────────────────────────────────
  registerHandler("auth:login", {
    schema: LoginSchema,
    handle: async (input) => {
      const user = await authService.login(input);
      session.setUser(user);
      return user;
    },
  });
  registerHandler("auth:logout", {
    schema: null,
    handle: () => {
      session.setUser(null);
    },
  });
  registerHandler("auth:bootstrap", {
    schema: null,
    handle: () => authService.bootstrap(),
  });
  // First-run setup: only usable while no users exist, then logs the new
  // owner in. Afterwards user creation goes through the guarded users:create.
  registerHandler("auth:setup", {
    schema: UserSchema,
    handle: async (input) => {
      if (authService.bootstrap().hasUsers) {
        throw new ConflictError("Setup already completed", "SETUP_DONE");
      }
      const user = await authService.createUser(input);
      session.setUser(user);
      return user;
    },
  });
  registerHandler("auth:resume", {
    schema: z.object({ userId: IdSchema }),
    handle: (input) => {
      const user = authService.resume(input.userId);
      session.setUser(user);
      return user;
    },
  });

  // ── users ───────────────────────────────────────────────────────────
  registerHandler("users:list", {
    schema: null,
    handle: () => authService.listUsers(),
  });
  registerHandler("users:create", {
    schema: UserSchema,
    handle: (input) => authService.createUser(input),
  });
  registerHandler("users:update", {
    schema: z.object({ id: IdSchema, data: UpdateUserSchema }),
    handle: (input) => authService.updateUser(input.id, input.data),
  });
  registerHandler("users:deactivate", {
    schema: byId,
    handle: (input) => authService.deactivateUser(input.id),
  });

  // ── categories ──────────────────────────────────────────────────────
  registerHandler("categories:list", {
    schema: null,
    handle: () => catalogService.listCategories(),
  });
  registerHandler("categories:create", {
    schema: CategorySchema,
    handle: (input) => catalogService.createCategory(input),
  });
  registerHandler("categories:update", {
    schema: z.object({ id: IdSchema, data: CategorySchema }),
    handle: (input) => catalogService.updateCategory(input.id, input.data),
  });
  registerHandler("categories:delete", {
    schema: byId,
    handle: (input) => catalogService.deleteCategory(input.id),
  });

  // ── colors ──────────────────────────────────────────────────────────
  registerHandler("colors:list", {
    schema: null,
    handle: () => colorsService.list(),
  });
  registerHandler("colors:create", {
    schema: ColorSchema,
    handle: (input) => colorsService.create(input),
  });
  registerHandler("colors:update", {
    schema: z.object({ id: IdSchema, data: ColorSchema }),
    handle: (input) => colorsService.update(input.id, input.data),
  });
  registerHandler("colors:delete", {
    schema: byId,
    handle: (input) => colorsService.delete(input.id),
  });
  registerHandler("colors:seedDefaults", {
    schema: null,
    handle: () => colorsService.seedDefaults(),
  });

  // ── products ────────────────────────────────────────────────────────
  registerHandler("products:list", {
    schema: ListProductsSchema,
    handle: (input) => catalogService.listProducts(input),
  });
  registerHandler("products:get", {
    schema: byId,
    handle: (input) => catalogService.getProduct(input.id),
  });
  registerHandler("products:getByBarcode", {
    schema: z.object({ barcode: z.string().min(1) }),
    handle: (input) => catalogService.getProductByBarcode(input.barcode),
  });
  registerHandler("products:create", {
    schema: ProductSchema,
    handle: (input) => catalogService.createProduct(input),
  });
  registerHandler("products:update", {
    schema: z.object({ id: IdSchema, data: ProductSchema }),
    handle: (input) => catalogService.updateProduct(input.id, input.data),
  });
  registerHandler("products:delete", {
    schema: byId,
    handle: (input) => catalogService.deleteProduct(input.id),
  });

  // ── customers ───────────────────────────────────────────────────────
  registerHandler("customers:list", {
    schema: ListCustomersSchema,
    handle: (input) => customersService.list(input),
  });
  registerHandler("customers:create", {
    schema: CustomerSchema,
    handle: (input) => customersService.create(input),
  });
  registerHandler("customers:update", {
    schema: z.object({ id: IdSchema, data: CustomerSchema }),
    handle: (input) => customersService.update(input.id, input.data),
  });
  registerHandler("customers:delete", {
    schema: byId,
    handle: (input) => customersService.delete(input.id),
  });

  // ── orders ──────────────────────────────────────────────────────────
  registerHandler("orders:checkout", {
    schema: CheckoutSchema,
    handle: (input) => ordersService.checkout(input),
  });
  registerHandler("orders:hold", {
    schema: HoldOrderSchema,
    handle: (input) => ordersService.hold(input),
  });
  registerHandler("orders:listHeld", {
    schema: null,
    handle: () => ordersService.listHeld(),
  });
  registerHandler("orders:resume", {
    schema: byId,
    handle: (input) => ordersService.resume(input.id),
  });
  registerHandler("orders:list", {
    schema: ListOrdersSchema,
    handle: (input) => ordersService.list(input),
  });
  registerHandler("orders:get", {
    schema: byId,
    handle: (input) => ordersService.get(input.id),
  });
  registerHandler("orders:refund", {
    schema: RefundSchema,
    handle: (input) => ordersService.refund(input),
  });

  // ── inventory ───────────────────────────────────────────────────────
  registerHandler("stock:movements", {
    schema: ListStockMovementsSchema,
    handle: (input) => inventoryService.listMovements(input),
  });
  registerHandler("stock:adjust", {
    schema: StockAdjustmentSchema,
    handle: (input) => inventoryService.adjust(input),
  });
  registerHandler("stock:purchase", {
    schema: StockPurchaseSchema,
    handle: (input) => inventoryService.purchase(input),
  });
  registerHandler("stock:lowStock", {
    schema: null,
    handle: () => inventoryService.listLowStock(),
  });

  // ── shifts ──────────────────────────────────────────────────────────
  registerHandler("shifts:current", {
    schema: null,
    handle: () => shiftsService.current(),
  });
  registerHandler("shifts:open", {
    schema: OpenShiftSchema,
    handle: (input) => shiftsService.open(input),
  });
  registerHandler("shifts:close", {
    schema: CloseShiftSchema,
    handle: (input) => shiftsService.close(input),
  });
  registerHandler("shifts:cashMovement", {
    schema: CashMovementSchema,
    handle: (input) => shiftsService.cashMovement(input),
  });
  registerHandler("shifts:list", {
    schema: null,
    handle: () => shiftsService.list(),
  });

  // ── settings ────────────────────────────────────────────────────────
  registerHandler("settings:get", {
    schema: null,
    handle: () => settings.get(),
  });
  registerHandler("settings:update", {
    schema: UpdateSettingsSchema,
    handle: (input) => settings.update(input),
  });

  // ── backup ──────────────────────────────────────────────────────────
  registerHandler("backup:export", {
    schema: null,
    handle: () => backupService.exportBackup(),
  });
  registerHandler("backup:restore", {
    schema: null,
    handle: () => backupService.restoreBackup(),
  });
}
