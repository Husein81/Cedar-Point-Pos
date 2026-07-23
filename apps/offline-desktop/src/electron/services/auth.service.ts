import bcrypt from "bcryptjs";
import type { User } from "../../shared/models";
import { UserRole } from "../../shared/enums";
import type { LoginInput, UserInput, UpdateUserInput } from "../../shared/schemas";
import type { UserRepository, UserRecord } from "../repositories/user.repository";
import { AuthError, ConflictError, NotFoundError } from "../core/errors";
import { newId, nowIso } from "../core/id";

const BCRYPT_ROUNDS = 12;

// Real hash of a random string — burned once so unknown-username logins
// still run exactly one bcrypt comparison (no timing enumeration).
const DUMMY_HASH = bcrypt.hashSync(newId(), BCRYPT_ROUNDS);

const toPublicUser = (record: UserRecord): User => ({
  id: record.id,
  name: record.name,
  username: record.username,
  role: record.role,
  isActive: record.isActive,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

export class AuthService {
  constructor(private readonly users: UserRepository) {}

  bootstrap(): { hasUsers: boolean } {
    return { hasUsers: this.users.count() > 0 };
  }

  async login(input: LoginInput): Promise<User> {
    const record = this.users.findByUsername(input.username);

    // Exactly one bcrypt comparison on every path.
    const hash = record?.passwordHash ?? DUMMY_HASH;
    const isValid = await bcrypt.compare(input.password, hash);

    if (!record || !isValid) {
      throw new AuthError("Invalid username or password", "INVALID_CREDENTIALS");
    }
    if (!record.isActive) {
      throw new AuthError("Account is disabled", "ACCOUNT_DISABLED");
    }

    return toPublicUser(record);
  }

  listUsers(): User[] {
    return this.users.list().map(toPublicUser);
  }

  // Re-validates a remembered user id (renderer-persisted, not trusted as-is)
  // still belongs to an active account before restoring the session.
  resume(userId: string): User {
    const record = this.users.findById(userId);
    if (!record || !record.isActive) {
      throw new AuthError("Session no longer valid", "SESSION_INVALID");
    }
    return toPublicUser(record);
  }

  async createUser(input: UserInput): Promise<User> {
    // First user ever created becomes the OWNER regardless of requested role
    // (initial setup flow); afterwards the requested role is honored.
    const isFirstUser = this.users.count() === 0;

    if (this.users.findByUsername(input.username)) {
      throw new ConflictError("Username already taken", "USERNAME_TAKEN");
    }

    const now = nowIso();
    const record: UserRecord = {
      id: newId(),
      name: input.name,
      username: input.username,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      role: isFirstUser ? UserRole.OWNER : input.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.users.insert(record);
    return toPublicUser(record);
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const record = this.users.findById(id);
    if (!record) throw new NotFoundError("User");

    if (input.username && input.username !== record.username) {
      const existing = this.users.findByUsername(input.username);
      if (existing && existing.id !== id) {
        throw new ConflictError("Username already taken", "USERNAME_TAKEN");
      }
    }

    // Explicit field picks — never spread the input.
    const next: UserRecord = {
      ...record,
      name: input.name ?? record.name,
      username: input.username ?? record.username,
      role: input.role ?? record.role,
      isActive: input.isActive ?? record.isActive,
      passwordHash: input.password
        ? await bcrypt.hash(input.password, BCRYPT_ROUNDS)
        : record.passwordHash,
      updatedAt: nowIso(),
    };

    this.users.update(next);
    return toPublicUser(next);
  }

  deactivateUser(id: string): User {
    const record = this.users.findById(id);
    if (!record) throw new NotFoundError("User");

    if (record.role === UserRole.OWNER) {
      const activeOwners = this.users
        .list()
        .filter((user) => user.role === UserRole.OWNER && user.isActive);
      if (activeOwners.length <= 1) {
        throw new ConflictError(
          "Cannot deactivate the last owner",
          "LAST_OWNER",
        );
      }
    }

    const next: UserRecord = { ...record, isActive: false, updatedAt: nowIso() };
    this.users.update(next);
    return toPublicUser(next);
  }
}
