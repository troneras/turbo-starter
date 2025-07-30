import { Type } from "@sinclair/typebox"

// Release status enum
export const ReleaseStatus = Type.Union([
  Type.Literal("OPEN"),
  Type.Literal("CLOSED"),
  Type.Literal("DEPLOYED"),
  Type.Literal("ROLLED_BACK"),
], {
  description: "Current status of the release"
})

// Base release schema
export const ReleaseSchema = Type.Object({
  id: Type.Number({ description: "Unique release identifier" }),
  name: Type.String({ description: "Release name" }),
  description: Type.Union([Type.String(), Type.Null()], { description: "Release description" }),
  status: ReleaseStatus,
  deploySeq: Type.Union([Type.Number(), Type.Null()], { 
    description: "Deployment sequence number (null until deployed)" 
  }),
  createdBy: Type.String({ format: "uuid", description: "User ID who created the release" }),
  createdAt: Type.String({ format: "date-time", description: "Release creation timestamp" }),
  deployedAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()], { 
    description: "Deployment timestamp" 
  }),
  deployedBy: Type.Union([Type.String({ format: "uuid" }), Type.Null()], { 
    description: "User ID who deployed the release" 
  }),
  changeCount: Type.Optional(Type.Number({ 
    description: "Number of changes in this release" 
  })),
  conflicts: Type.Optional(Type.Object({
    hasConflicts: Type.Boolean({ description: "Whether the release has any conflicts" }),
    parallelCount: Type.Number({ description: "Number of parallel work conflicts" }),
    overwriteCount: Type.Number({ description: "Number of overwrite conflicts" }),
    totalCount: Type.Number({ description: "Total number of conflicts" })
  }, { description: "Conflict information for CLOSED releases" })),
}, {
  description: "Release entity representing a logical grouping of content changes"
})

// Entity version schema
export const EntityVersionSchema = Type.Object({
  entityId: Type.Number({ description: "Entity ID" }),
  releaseId: Type.Number({ description: "Release ID this version belongs to" }),
  entityType: Type.String({ description: "Type of entity (e.g., BRAND, TRANSLATION, PAGE)" }),
  brandId: Type.Union([Type.Number(), Type.Null()], { description: "Associated brand ID" }),
  jurisdictionId: Type.Union([Type.Number(), Type.Null()], { description: "Associated jurisdiction ID" }),
  localeId: Type.Union([Type.Number(), Type.Null()], { description: "Associated locale ID" }),
  title: Type.Union([Type.String(), Type.Null()], { description: "Content title" }),
  slug: Type.Union([Type.String(), Type.Null()], { description: "URL slug" }),
  status: Type.String({ description: "Content status (e.g., draft, published)" }),
  payload: Type.Record(Type.String(), Type.Any(), { 
    description: "Flexible payload for entity-specific data" 
  }),
  changeType: Type.Union([
    Type.Literal("CREATE"),
    Type.Literal("UPDATE"),
    Type.Literal("DELETE"),
  ], { description: "Type of change in this version" }),
  changeSetId: Type.Union([Type.String({ format: "uuid" }), Type.Null()], { 
    description: "ID grouping related changes" 
  }),
  changeReason: Type.Union([Type.String(), Type.Null()], { 
    description: "Reason for the change" 
  }),
  createdBy: Type.String({ format: "uuid", description: "User ID who created this version" }),
  createdAt: Type.String({ format: "date-time", description: "Version creation timestamp" }),
}, {
  description: "Immutable snapshot of an entity within a specific release"
})

// Request schemas
export const CreateReleaseRequestSchema = Type.Object({
  name: Type.String({ 
    minLength: 1, 
    maxLength: 255, 
    description: "Release name (required)" 
  }),
  description: Type.Optional(Type.String({ description: "Release description" })),
}, {
  additionalProperties: false,
  description: "Request body for creating a new release"
})

export const UpdateReleaseRequestSchema = Type.Object({
  name: Type.Optional(Type.String({ 
    minLength: 1, 
    maxLength: 255, 
    description: "Updated release name" 
  })),
  description: Type.Optional(Type.String({ description: "Updated release description" })),
  status: Type.Optional(Type.Union([
    Type.Literal("OPEN"),
    Type.Literal("CLOSED"),
  ], { description: "Updated release status (only OPEN/CLOSED can be set manually)" })),
}, {
  additionalProperties: false,
  description: "Request body for updating a release"
})

export const DeployReleaseRequestSchema = Type.Object({
  confirmationToken: Type.String({ 
    description: "Confirmation token to prevent accidental deployments" 
  }),
}, {
  additionalProperties: false,
  description: "Request body for deploying a release"
})

export const RollbackReleaseRequestSchema = Type.Object({
  targetReleaseId: Type.Number({ 
    description: "ID of previously deployed release to rollback to" 
  }),
  confirmationToken: Type.String({ 
    description: "Confirmation token to prevent accidental rollbacks" 
  }),
}, {
  additionalProperties: false,
  description: "Request body for rolling back to a previous release"
})

export const PreviewDiffRequestSchema = Type.Object({
  fromReleaseId: Type.Number({ description: "Base release ID for comparison" }),
  toReleaseId: Type.Number({ description: "Target release ID for comparison" }),
  entityTypes: Type.Optional(Type.Array(Type.String(), { 
    description: "Filter diff by specific entity types" 
  })),
  brandIds: Type.Optional(Type.Array(Type.Number(), { 
    description: "Filter diff by specific brand IDs" 
  })),
}, {
  additionalProperties: false,
  description: "Request body for previewing differences between releases"
})

// Path parameter schemas
export const ReleaseParamsSchema = Type.Object({
  id: Type.Number({ description: "Release ID" })
}, {
  description: "Path parameters for release operations"
})

// Query parameter schemas
export const ReleaseQuerySchema = Type.Object({
  status: Type.Optional(ReleaseStatus),
  createdBy: Type.Optional(Type.String({ format: "uuid" })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 50 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
}, {
  additionalProperties: false,
  description: "Query parameters for listing releases"
})

// Response schemas
export const ReleaseListResponseSchema = Type.Object({
  releases: Type.Array(ReleaseSchema),
  total: Type.Number({ description: "Total number of releases" }),
  limit: Type.Number({ description: "Number of releases per page" }),
  offset: Type.Number({ description: "Current offset" }),
}, {
  description: "Paginated list of releases"
})

export const ReleaseDetailResponseSchema = ReleaseSchema

export const CreateReleaseResponseSchema = ReleaseSchema

export const DeployReleaseResponseSchema = Type.Object({
  success: Type.Boolean(),
  deployedRelease: ReleaseSchema,
  deploymentTimestamp: Type.String({ format: "date-time" }),
}, {
  description: "Response after successful deployment"
})

export const DiffChangeSchema = Type.Object({
  entityId: Type.Number(),
  entityType: Type.String(),
  changeType: Type.Union([
    Type.Literal("ADDED"),
    Type.Literal("MODIFIED"),
    Type.Literal("DELETED"),
  ]),
  fromVersion: Type.Optional(EntityVersionSchema),
  toVersion: Type.Optional(EntityVersionSchema),
  differences: Type.Optional(Type.Record(Type.String(), Type.Any())),
}, {
  description: "Single change in a release diff"
})

export const PreviewDiffResponseSchema = Type.Object({
  fromRelease: ReleaseSchema,
  toRelease: ReleaseSchema,
  changes: Type.Array(DiffChangeSchema),
  summary: Type.Object({
    totalChanges: Type.Number(),
    added: Type.Number(),
    modified: Type.Number(),
    deleted: Type.Number(),
  }),
}, {
  description: "Detailed diff between two releases"
})