import { type Static } from "@sinclair/typebox"
import { ErrorResponseSchema } from "../schemas/common.js"

/**
 * Generic error response structure.
 * 
 * @description Standard error format returned by API endpoints when operations fail.
 * Provides a consistent error interface across all endpoints.
 * 
 * @example
 * ```typescript
 * const error: ErrorResponse = {
 *   error: "User not found"
 * }
 * ```
 * 
 * @see {@link https://fastify.dev/docs/latest/Reference/Errors/} Fastify Error Handling
 */
export type ErrorResponse = Static<typeof ErrorResponseSchema> 