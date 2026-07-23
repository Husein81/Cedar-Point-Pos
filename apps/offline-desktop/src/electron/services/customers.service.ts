import type { Customer, Paginated } from "../../shared/models";
import type { CustomerInput, ListCustomersInput } from "../../shared/schemas";
import type { CustomerRepository } from "../repositories/customer.repository";
import { NotFoundError } from "../core/errors";
import { newId, nowIso } from "../core/id";

// Empty-string form values mean "not provided".
const orNull = (value: string | null | undefined): string | null =>
  value ? value : null;

export class CustomersService {
  constructor(private readonly customers: CustomerRepository) {}

  list(params: ListCustomersInput): Paginated<Customer> {
    return this.customers.list(params);
  }

  create(input: CustomerInput): Customer {
    const now = nowIso();
    const customer: Customer = {
      id: newId(),
      name: input.name,
      phone: orNull(input.phone),
      email: orNull(input.email),
      address: orNull(input.address),
      loyaltyPoints: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.customers.insert(customer);
    return customer;
  }

  update(id: string, input: CustomerInput): Customer {
    const existing = this.customers.findById(id);
    if (!existing) throw new NotFoundError("Customer");

    const next: Customer = {
      ...existing,
      name: input.name,
      phone: orNull(input.phone),
      email: orNull(input.email),
      address: orNull(input.address),
      updatedAt: nowIso(),
    };
    this.customers.update(next);
    return next;
  }

  delete(id: string): void {
    const existing = this.customers.findById(id);
    if (!existing) throw new NotFoundError("Customer");
    this.customers.softDelete(id, nowIso());
  }
}
