import type { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import {
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
  PreviewDiffResponseSchema
} from '@cms/contracts/schemas/releases'
import {
  BadRequestErrorSchema,
  UnauthorizedErrorSchema,
  ForbiddenErrorSchema,
  NotFoundErrorSchema,
  ConflictErrorSchema
} from '@cms/contracts/schemas/common'
import type {
  CreateReleaseRequest,
  UpdateReleaseRequest,
  DeployReleaseRequest,
  RollbackReleaseRequest,
  PreviewDiffRequest,
  ReleaseParams,
  ReleaseQuery
} from '@cms/contracts/types/releases'

export default async function (fastify: FastifyInstance) {
  // List releases
  fastify.get('/', {
    schema: {
      tags: ['releases'],
      summary: 'List releases with optional filters',
      description: 'Retrieve a paginated list of releases with optional filtering by status or creator',
      security: [{ bearerAuth: [] }],
      querystring: ReleaseQuerySchema,
      response: {
        200: ReleaseListResponseSchema,
        401: UnauthorizedErrorSchema
      }
    },
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const query = request.query as ReleaseQuery
    
    const result = await fastify.releases.getReleases({
      status: query.status,
      createdBy: query.createdBy,
      limit: query.limit,
      offset: query.offset
    })

    return result
  })

  // Get single release
  fastify.get('/:id', {
    schema: {
      tags: ['releases'],
      summary: 'Get release details',
      description: 'Retrieve detailed information about a specific release',
      security: [{ bearerAuth: [] }],
      params: ReleaseParamsSchema,
      response: {
        200: ReleaseDetailResponseSchema,
        401: UnauthorizedErrorSchema,
        404: NotFoundErrorSchema
      }
    },
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params as ReleaseParams
    
    const release = await fastify.releases.getRelease(id)
    if (!release) {
      return reply.notFound('Release not found')
    }

    return release
  })

  // Create release
  fastify.post('/', {
    schema: {
      tags: ['releases'],
      summary: 'Create a new release',
      description: 'Create a new release, optionally based on an existing release',
      security: [{ bearerAuth: [] }],
      body: CreateReleaseRequestSchema,
      response: {
        201: CreateReleaseResponseSchema,
        400: BadRequestErrorSchema,
        401: UnauthorizedErrorSchema,
        403: ForbiddenErrorSchema
      }
    },
    onRequest: [
      fastify.authenticate,
      fastify.requirePermission('releases:create')
    ]
  }, async (request, reply) => {
    const data = request.body as CreateReleaseRequest
    
    // Debug logging in test mode
    if (process.env.TEST_MODE === 'true') {
      fastify.log.debug({ 
        user: request.user,
        isTestMode: process.env.TEST_MODE 
      }, 'Create release request')
    }
    
    try {
      const release = await fastify.releases.createRelease(data, (request.user as any).sub)
      reply.code(201)
      return release
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return reply.conflict('A release with this name already exists')
      }
      throw error
    }
  })

  // Update release
  fastify.patch('/:id', {
    schema: {
      tags: ['releases'],
      summary: 'Update release metadata',
      description: 'Update a release\'s name, description, or status (OPEN/CLOSED only)',
      security: [{ bearerAuth: [] }],
      params: ReleaseParamsSchema,
      body: UpdateReleaseRequestSchema,
      response: {
        200: ReleaseDetailResponseSchema,
        400: BadRequestErrorSchema,
        401: UnauthorizedErrorSchema,
        403: ForbiddenErrorSchema,
        404: NotFoundErrorSchema
      }
    },
    onRequest: [
      fastify.authenticate,
      fastify.requirePermission('releases:update')
    ]
  }, async (request, reply) => {
    const { id } = request.params as ReleaseParams
    const data = request.body as UpdateReleaseRequest
    
    try {
      // Get current release to check permissions
      const currentRelease = await fastify.releases.getRelease(id)
      if (!currentRelease) {
        return reply.notFound('Release not found')
      }

      // Only allow updating OPEN releases
      if (currentRelease.status !== 'OPEN' && currentRelease.status !== 'CLOSED') {
        return reply.badRequest('Can only update OPEN or CLOSED releases')
      }

      // If changing to CLOSED, require additional permissions
      if (data.status === 'CLOSED' && currentRelease.status === 'OPEN') {
        const userRoles = await fastify.users.getUserRoles((request.user as any).sub)
        if (!userRoles.includes('admin') && !userRoles.includes('editor')) {
          return reply.forbidden('Insufficient permissions to close release')
        }
      }

      const updated = await fastify.releases.updateRelease(id, data)
      return updated
    } catch (error: any) {
      if (error.message === 'Release not found') {
        return reply.notFound('Release not found')
      }
      throw error
    }
  })

  // Deploy release
  fastify.post('/:id/deploy', {
    schema: {
      tags: ['releases'],
      summary: 'Deploy a release to production',
      description: 'Deploy a CLOSED release, making it the active production release',
      security: [{ bearerAuth: [] }],
      params: ReleaseParamsSchema,
      body: DeployReleaseRequestSchema,
      response: {
        200: DeployReleaseResponseSchema,
        400: BadRequestErrorSchema,
        401: UnauthorizedErrorSchema,
        403: ForbiddenErrorSchema,
        404: NotFoundErrorSchema,
        409: ConflictErrorSchema
      }
    },
    onRequest: [
      fastify.authenticate,
      fastify.requirePermission('releases:deploy')
    ]
  }, async (request, reply) => {
    const { id } = request.params as ReleaseParams
    const { confirmationToken } = request.body as DeployReleaseRequest
    
    // Validate confirmation token
    if (confirmationToken !== 'DEPLOY-CONFIRMED') {
      return reply.badRequest('Invalid confirmation token')
    }

    try {
      const deployed = await fastify.releases.deployRelease(id, (request.user as any).sub)
      
      return {
        success: true,
        deployedRelease: deployed,
        deploymentTimestamp: deployed.deployedAt!
      }
    } catch (error: any) {
      if (error.message === 'Release not found') {
        return reply.notFound('Release not found')
      }
      if (error.message === 'Only CLOSED releases can be deployed') {
        return reply.conflict('Release must be CLOSED before deployment')
      }
      throw error
    }
  })

  // Rollback to previous release
  fastify.post('/rollback', {
    schema: {
      tags: ['releases'],
      summary: 'Rollback to a previous release',
      description: 'Instantly rollback to a previously deployed release',
      security: [{ bearerAuth: [] }],
      body: RollbackReleaseRequestSchema,
      response: {
        200: DeployReleaseResponseSchema,
        400: BadRequestErrorSchema,
        401: UnauthorizedErrorSchema,
        403: ForbiddenErrorSchema,
        404: NotFoundErrorSchema
      }
    },
    onRequest: [
      fastify.authenticate,
      fastify.requirePermission('releases:rollback')
    ]
  }, async (request, reply) => {
    const { targetReleaseId, confirmationToken } = request.body as RollbackReleaseRequest
    
    // Validate confirmation token
    if (confirmationToken !== 'ROLLBACK-CONFIRMED') {
      return reply.badRequest('Invalid confirmation token')
    }

    try {
      const rolledBack = await fastify.releases.rollbackToRelease(targetReleaseId, (request.user as any).sub)
      
      return {
        success: true,
        deployedRelease: rolledBack,
        deploymentTimestamp: rolledBack.deployedAt!
      }
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.notFound('Target release not found or was never deployed')
      }
      throw error
    }
  })

  // Preview diff between releases
  fastify.post('/diff', {
    schema: {
      tags: ['releases'],
      summary: 'Preview differences between releases',
      description: 'Compare content between two releases to see what will change',
      security: [{ bearerAuth: [] }],
      body: PreviewDiffRequestSchema,
      response: {
        200: PreviewDiffResponseSchema,
        400: BadRequestErrorSchema,
        401: UnauthorizedErrorSchema,
        404: NotFoundErrorSchema
      }
    },
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { fromReleaseId, toReleaseId, entityTypes, brandIds } = request.body as PreviewDiffRequest
    
    // Validate releases exist
    const [fromRelease, toRelease] = await Promise.all([
      fastify.releases.getRelease(fromReleaseId),
      fastify.releases.getRelease(toReleaseId)
    ])

    if (!fromRelease) {
      return reply.notFound('From release not found')
    }
    if (!toRelease) {
      return reply.notFound('To release not found')
    }

    // Get diff
    const changes = await fastify.releases.previewDiff(
      fromReleaseId,
      toReleaseId,
      entityTypes,
      brandIds
    )

    // Calculate summary
    const summary = {
      totalChanges: changes.length,
      added: changes.filter(c => c.changeType === 'ADDED').length,
      modified: changes.filter(c => c.changeType === 'MODIFIED').length,
      deleted: changes.filter(c => c.changeType === 'DELETED').length
    }

    return {
      fromRelease,
      toRelease,
      changes,
      summary
    }
  })

  // Get current active release
  fastify.get('/active', {
    schema: {
      tags: ['releases'],
      summary: 'Get current active release',
      description: 'Retrieve the currently active release for this session',
      security: [{ bearerAuth: [] }],
      response: {
        200: Type.Object({
          releaseId: Type.Union([Type.Number(), Type.Null()]),
          release: Type.Union([ReleaseDetailResponseSchema, Type.Null()])
        }),
        401: UnauthorizedErrorSchema
      }
    },
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const releaseContext = fastify.getReleaseContext(request)
    
    if (!releaseContext) {
      return {
        releaseId: null,
        release: null
      }
    }

    const release = await fastify.releases.getRelease(releaseContext.releaseId)
    
    return {
      releaseId: releaseContext.releaseId,
      release
    }
  })
}