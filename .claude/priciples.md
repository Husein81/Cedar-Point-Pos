# principles.md

# Cedar Point Engineering Standards

These instructions apply to every task unless explicitly overridden by the user.

## Core Principles

Always write code that is:

- Simple
- Readable
- Maintainable
- Testable
- Consistent with the existing codebase

When multiple solutions exist, choose the one with the lowest long-term maintenance cost.

---

# Single Responsibility Principle

Follow Single Responsibility Principle.

- Every class, function, hook, and module should have one responsibility.
- Split large files into focused modules.
- Avoid "God classes" and oversized React components.


# DRY

Don't Repeat Yourself.

Whenever duplicate logic is discovered:

- Extract reusable utilities.
- Extract reusable hooks.
- Extract reusable services.
- Extract reusable components.

Avoid copy-paste implementations.

---

# KISS

Keep It Simple.

Always prefer:

- straightforward code
- simple control flow
- small functions
- descriptive naming

Never introduce unnecessary abstractions.

Avoid clever code.

Readable code is preferred over concise code.

---

# Clean Code

Always:

- Use meaningful names.
- Keep functions short.
- Keep files focused.
- Return early instead of deep nesting.
- Minimize side effects.
- Avoid magic numbers.
- Prefer constants.
- Use strict typing.
- Remove dead code.
- Remove unused imports.
- Remove commented-out code.

---

# Architecture

Organize code by feature.

Separate:

- UI
- Business Logic
- Data Access
- Infrastructure

Never mix responsibilities.

---

# React

Prefer:

- Functional components
- Custom hooks
- Composition over inheritance
- Memoization only when beneficial

Avoid:

- Large components
- Prop drilling
- Massive useEffect chains
- Duplicate state

---

# TypeScript

Always:

- Use strict typing.
- Avoid any.
- Prefer unknown over any.
- Prefer type inference when clear.
- Create reusable types.
- Use discriminated unions when appropriate.

---

# State Management

Keep state minimal.

Only store:

- data that changes
- data shared between components

Avoid derived state.

Compute values instead.

---

# Error Handling

Never silently ignore errors.

Always:

- Handle expected failures.
- Return meaningful error messages.
- Log unexpected failures.
- Avoid swallowing exceptions.

---

# Performance

Optimize only after correctness.

Prefer:

- efficient algorithms
- lazy loading
- pagination
- memoization where appropriate

Avoid premature optimization.

---

# Testing

Every business-critical feature should include tests.

Prefer:

- Vitest
- React Testing Library

Tests should verify:

- expected behavior
- edge cases
- failure cases

Avoid testing implementation details.

---

# Database

Prefer:

- transactions where needed
- indexes for query performance
- constraints over application-only validation

Avoid duplicated queries.

Keep queries efficient.

---

# API Design

Design REST APIs that are:

- predictable
- consistent
- versionable

Validate every request.

Never trust client input.

---

# Security

Always:

- validate inputs
- sanitize outputs
- authorize every protected operation
- authenticate before authorization
- never expose secrets
- never hardcode credentials

---

# Logging

Use structured logging.

Log:

- important operations
- warnings
- unexpected failures

Do not log sensitive information.

---

# Refactoring

When modifying existing code:

- Leave the code cleaner than before.
- Reduce complexity.
- Remove duplication.
- Preserve behavior.
- Do not introduce breaking changes unless requested.

---

# Code Reviews

Before finishing any task, verify:

- SOLID principles are respected.
- DRY violations are removed.
- KISS is maintained.
- Naming is clear.
- Types are correct.
- Error handling exists.
- Edge cases are handled.
- Dead code is removed.
- Formatting is consistent.

---

# Response Style

When generating code:

- Produce production-ready code.
- Follow existing project conventions.
- Do not invent unnecessary abstractions.
- Explain trade-offs when applicable.
- If a better architecture exists, recommend it with reasoning.
- When fixing bugs, identify the root cause instead of applying superficial fixes.

The goal is to produce clean, maintainable, scalable, and production-ready software.