import { type Static } from "@sinclair/typebox"
import {
    LoginRequestSchema,
    AuthUserSchema,
    LoginResponseSchema
} from "../schemas/auth.js"

/**
 * Login request data for authentication endpoints.
 * 
 * @description Represents the payload for user authentication. Must provide either 
 * an Azure AD token for user authentication or a service token for service-to-service 
 * authentication, but not both.
 * 
 * @example
 * ```typescript
 * // User authentication
 * const userLogin: LoginRequest = {
 *   azure_token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6..."
 * }
 * 
 * // Service authentication  
 * const serviceLogin: LoginRequest = {
 *   service_token: "srv_abc123..."
 * }
 * ```
 */
export type LoginRequest = Static<typeof LoginRequestSchema>

/**
 * Successful authentication response containing JWT and user information.
 * 
 * @description Returned after successful login, providing everything needed for 
 * subsequent API calls and user interface display.
 * 
 * @example
 * ```typescript
 * const response: LoginResponse = {
 *   jwt: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6...",
 *   user: {
 *     id: "user-123",
 *     email: "john.doe@example.com", 
 *     name: "John Doe"
 *   },
 *   roles: ["user", "editor"],
 *   permissions: ["read:content", "write:content"]
 * }
 * ```
 */
export type LoginResponse = Static<typeof LoginResponseSchema>

/**
 * Basic user information returned in authentication responses.
 * 
 * @description A simplified user object containing essential identification 
 * and display information. Used specifically in authentication contexts.
 * 
 * @example
 * ```typescript
 * const user: AuthUser = {
 *   id: "user-123",
 *   email: "john.doe@example.com",
 *   name: "John Doe"
 * }
 * ```
 */
export type AuthUser = Static<typeof AuthUserSchema> 