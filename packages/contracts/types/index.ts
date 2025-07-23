/**
 * @fileoverview TypeScript type definitions for the CMS Platform API contracts.
 * 
 * @description This module exports all TypeScript types derived from the corresponding
 * TypeBox schemas. These types provide compile-time type safety for API interactions
 * while the schemas provide runtime validation.
 * 
 * @example
 * ```typescript
 * import type { User, CreateUserRequest } from "@cms/contracts/types"
 * import { UserSchema, CreateUserRequestSchema } from "@cms/contracts/schemas"
 * 
 * // Use types for TypeScript annotations
 * const user: User = {
 *   id: "user-123",
 *   email: "john@example.com",
 *   name: "John Doe"
 * }
 * 
 * // Use schemas for runtime validation
 * const isValid = Type.Check(UserSchema, user)
 * ```
 */

// Re-export all types from individual modules
export * from "./auth.js"
export * from "./brands.js"
export * from "./common.js"
export * from "./roles.js"
export * from "./users.js"
export * from "./test-users.js" 