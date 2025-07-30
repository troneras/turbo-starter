import { type Static } from "@sinclair/typebox"
import {
    ReleaseStatus,
    ReleaseSchema,
    EntityVersionSchema,
    CreateReleaseRequestSchema,
    UpdateReleaseRequestSchema,
    DeployReleaseRequestSchema,
    RollbackReleaseRequestSchema,
    PreviewDiffRequestSchema,
    ReleaseParamsSchema,
    ReleaseQuerySchema,
    ReleaseListResponseSchema,
    ReleaseDetailResponseSchema,
    CreateReleaseResponseSchema,
    DeployReleaseResponseSchema,
    DiffChangeSchema,
    PreviewDiffResponseSchema
} from "../schemas/releases.js"

/**
 * Release status enumeration.
 * 
 * @description Represents the lifecycle state of a release in the CMS.
 * 
 * - OPEN: Release is actively being edited
 * - CLOSED: Release is finalized and ready for deployment
 * - DEPLOYED: Release is live in production
 * - ROLLED_BACK: Release was previously deployed but has been superseded
 */
export type ReleaseStatus = Static<typeof ReleaseStatus>

/**
 * Core release entity for content versioning.
 * 
 * @description Represents a logical grouping of content changes that can be 
 * previewed, deployed, and rolled back atomically. Releases enable safe parallel 
 * content development and instant rollback capabilities.
 * 
 * @example
 * ```typescript
 * const release: Release = {
 *   id: 42,
 *   name: "Summer Campaign 2025",
 *   description: "Q3 marketing content updates",
 *   status: "OPEN",
 *   deploySeq: null,
 *   createdBy: "550e8400-e29b-41d4-a716-446655440000",
 *   createdAt: "2025-07-01T10:00:00Z",
 *   deployedAt: null,
 *   deployedBy: null
 * }
 * ```
 */
export type Release = Static<typeof ReleaseSchema>

/**
 * Immutable entity version within a release.
 * 
 * @description Represents a snapshot of an entity (brand, translation, page, etc.) 
 * at a specific point in time within a release. All content changes are tracked 
 * as new versions, never updating existing records.
 * 
 * @example
 * ```typescript
 * const version: EntityVersion = {
 *   entityId: 1001,
 *   releaseId: 42,
 *   entityType: "TRANSLATION",
 *   brandId: 1,
 *   jurisdictionId: 5,
 *   localeId: 2,
 *   title: "Welcome Message",
 *   slug: "welcome-message",
 *   status: "published",
 *   payload: {
 *     content: "Welcome to our platform!",
 *     metadata: { lastReviewed: "2025-06-15" }
 *   },
 *   changeType: "UPDATE",
 *   changeSetId: "batch-123",
 *   changeReason: "Updated for summer campaign",
 *   createdBy: "550e8400-e29b-41d4-a716-446655440000",
 *   createdAt: "2025-07-01T10:30:00Z"
 * }
 * ```
 */
export type EntityVersion = Static<typeof EntityVersionSchema>

/**
 * Request to create a new release.
 * 
 * @description Payload for creating a new release. Releases start empty and 
 * only contain intentional changes, following a Git-like workflow.
 * 
 * @example
 * ```typescript
 * const request: CreateReleaseRequest = {
 *   name: "Black Friday 2025",
 *   description: "Special offers and promotional content"
 * }
 * ```
 */
export type CreateReleaseRequest = Static<typeof CreateReleaseRequestSchema>

/**
 * Request to update release metadata.
 * 
 * @description Payload for updating a release's name, description, or status. 
 * Only OPEN releases can be updated, and status can only be changed between 
 * OPEN and CLOSED.
 * 
 * @example
 * ```typescript
 * const request: UpdateReleaseRequest = {
 *   name: "Black Friday 2025 - Final",
 *   status: "CLOSED" // Mark as ready for deployment
 * }
 * ```
 */
export type UpdateReleaseRequest = Static<typeof UpdateReleaseRequestSchema>

/**
 * Request to deploy a release to production.
 * 
 * @description Payload for deploying a CLOSED release. Requires a confirmation 
 * token to prevent accidental deployments. Deployment is atomic and instant.
 * 
 * @example
 * ```typescript
 * const request: DeployReleaseRequest = {
 *   confirmationToken: "DEPLOY-CONFIRMED"
 * }
 * ```
 */
export type DeployReleaseRequest = Static<typeof DeployReleaseRequestSchema>

/**
 * Request to rollback to a previous release.
 * 
 * @description Payload for instantly rolling back to a previously deployed 
 * release. Requires confirmation to prevent accidents.
 * 
 * @example
 * ```typescript
 * const request: RollbackReleaseRequest = {
 *   targetReleaseId: 40,
 *   confirmationToken: "ROLLBACK-CONFIRMED"
 * }
 * ```
 */
export type RollbackReleaseRequest = Static<typeof RollbackReleaseRequestSchema>

/**
 * Request to preview differences between releases.
 * 
 * @description Payload for comparing content between two releases. Useful for 
 * reviewing changes before deployment or understanding what will be rolled back.
 * 
 * @example
 * ```typescript
 * const request: PreviewDiffRequest = {
 *   fromReleaseId: 40, // Currently deployed
 *   toReleaseId: 42,   // Ready to deploy
 *   entityTypes: ["TRANSLATION", "PAGE"],
 *   brandIds: [1, 2]
 * }
 * ```
 */
export type PreviewDiffRequest = Static<typeof PreviewDiffRequestSchema>

/**
 * Path parameters for release operations.
 * 
 * @description Contains the release ID from the URL path.
 * 
 * @example
 * ```typescript
 * const params: ReleaseParams = {
 *   id: 42
 * }
 * ```
 */
export type ReleaseParams = Static<typeof ReleaseParamsSchema>

/**
 * Query parameters for listing releases.
 * 
 * @description Filters and pagination options for release listings.
 * 
 * @example
 * ```typescript
 * const query: ReleaseQuery = {
 *   status: "DEPLOYED",
 *   createdBy: "550e8400-e29b-41d4-a716-446655440000",
 *   limit: 20,
 *   offset: 0
 * }
 * ```
 */
export type ReleaseQuery = Static<typeof ReleaseQuerySchema>

/**
 * Paginated list of releases.
 * 
 * @description Response containing releases with pagination metadata. Used for 
 * release management interfaces and deployment history.
 * 
 * @example
 * ```typescript
 * const response: ReleaseListResponse = {
 *   releases: [
 *     {
 *       id: 42,
 *       name: "Summer Campaign",
 *       status: "DEPLOYED",
 *       // ... other fields
 *     }
 *   ],
 *   total: 150,
 *   limit: 20,
 *   offset: 0
 * }
 * ```
 */
export type ReleaseListResponse = Static<typeof ReleaseListResponseSchema>

/**
 * Detailed release information.
 * 
 * @description Complete release details for viewing or editing.
 */
export type ReleaseDetailResponse = Static<typeof ReleaseDetailResponseSchema>

/**
 * Response after creating a release.
 * 
 * @description Returns the newly created release with assigned ID and metadata.
 */
export type CreateReleaseResponse = Static<typeof CreateReleaseResponseSchema>

/**
 * Response after successful deployment.
 * 
 * @description Confirmation of deployment with updated release information and 
 * timestamp.
 * 
 * @example
 * ```typescript
 * const response: DeployReleaseResponse = {
 *   success: true,
 *   deployedRelease: {
 *     id: 42,
 *     status: "DEPLOYED",
 *     deploySeq: 156,
 *     // ... other fields
 *   },
 *   deploymentTimestamp: "2025-07-15T14:30:00Z"
 * }
 * ```
 */
export type DeployReleaseResponse = Static<typeof DeployReleaseResponseSchema>

/**
 * Single change in a release diff.
 * 
 * @description Represents one content change between releases, including the 
 * before/after states and what specifically changed.
 * 
 * @example
 * ```typescript
 * const change: DiffChange = {
 *   entityId: 1001,
 *   entityType: "TRANSLATION",
 *   changeType: "MODIFIED",
 *   fromVersion: {
 *     // ... previous version
 *   },
 *   toVersion: {
 *     // ... new version
 *   },
 *   differences: {
 *     title: { from: "Old Title", to: "New Title" },
 *     payload: {
 *       content: { from: "Old content", to: "Updated content" }
 *     }
 *   }
 * }
 * ```
 */
export type DiffChange = Static<typeof DiffChangeSchema>

/**
 * Complete diff between two releases.
 * 
 * @description Comprehensive comparison showing all changes between releases 
 * with summary statistics. Used for change review and deployment planning.
 * 
 * @example
 * ```typescript
 * const response: PreviewDiffResponse = {
 *   fromRelease: {
 *     id: 40,
 *     name: "Current Production",
 *     status: "DEPLOYED"
 *   },
 *   toRelease: {
 *     id: 42,
 *     name: "Summer Campaign",
 *     status: "CLOSED"
 *   },
 *   changes: [
 *     // ... array of DiffChange objects
 *   ],
 *   summary: {
 *     totalChanges: 47,
 *     added: 12,
 *     modified: 30,
 *     deleted: 5
 *   }
 * }
 * ```
 */
export type PreviewDiffResponse = Static<typeof PreviewDiffResponseSchema>