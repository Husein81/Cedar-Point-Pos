// Tracks which local user is signed in on this terminal. Set on successful
// login, cleared on logout. Services requiring an actor call requireUserId().
// Single-terminal app → a single in-memory session is the correct scope.

import { AuthError } from "../core/errors";
import type { User } from "../../shared/models";

export class SessionContext {
  private currentUser: User | null = null;

  setUser(user: User | null) {
    this.currentUser = user;
  }

  getUser(): User | null {
    return this.currentUser;
  }

  requireUserId(): string {
    if (!this.currentUser) {
      throw new AuthError("Not signed in", "NOT_AUTHENTICATED");
    }
    return this.currentUser.id;
  }
}
