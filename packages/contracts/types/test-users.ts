import { type Static } from "@sinclair/typebox"
import {
    TestUserSchema,
    TestUsersResponseSchema
} from "../schemas/test-users.js"

/**
 * Test user data structure for frontend testing.
 *
 * @description Represents a test user with their associated roles and permissions.
 * Used by the frontend test authentication system to simulate different user types.
 *
 * @example
 * ```typescript
 * const testUser: TestUser = {
 *   id: "f946028c-c1d0-4eee-9772-c766050d4cf7",
 *   email: "alice@company.com", 
 *   name: "Alice Johnson",
 *   roles: ["admin", "editor"],
 *   permissions: ["users:read", "users:create", "translations:write"],
 *   jwt: "mock-admin-jwt-token"
 * }
 * ```
 */
export type TestUser = Static<typeof TestUserSchema>

/**
 * Response containing available test users for frontend development.
 *
 * @description Groups test users by their primary role type for easy access
 * in the frontend test authentication system.
 *
 * @example
 * ```typescript
 * const response: TestUsersResponse = {
 *   admin: { id: "...", email: "alice@company.com", ... },
 *   editor: { id: "...", email: "bob@company.com", ... },
 *   translator: { id: "...", email: "carol@company.com", ... }
 * }
 * ```
 */
export type TestUsersResponse = Static<typeof TestUsersResponseSchema>