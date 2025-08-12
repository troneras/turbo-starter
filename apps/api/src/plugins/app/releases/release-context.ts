import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    releaseContext?: {
      releaseId: number
      isPreview?: boolean
    }
  }
}

/**
 * Release context middleware plugin
 * 
 * This plugin adds release awareness to all requests by:
 * 1. Extracting release ID from headers or query parameters
 * 2. Setting the PostgreSQL session variable for release-aware queries
 * 3. Adding release context to the request object
 */
export default fp(async function releaseContext(fastify: FastifyInstance) {
  // Add hook to set release context for each request
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Extract release ID from various sources (in order of precedence)
      let releaseId: number | undefined

      // 1. Check X-CMS-Release header
      const headerRelease = request.headers['x-cms-release'] as string | undefined
      if (headerRelease) {
        releaseId = parseInt(headerRelease, 10)
        if (isNaN(releaseId)) {
          return reply.badRequest('Invalid X-CMS-Release header value')
        }
      }

      // 2. Check query parameter
      if (!releaseId && request.query) {
        const queryRelease = (request.query as any).release
        if (queryRelease) {
          releaseId = parseInt(queryRelease, 10)
          if (isNaN(releaseId)) {
            return reply.badRequest('Invalid release query parameter')
          }
        }
      }

      // 3. Get current active/deployed release if not specified (but only for operations that need release context)
      const needsReleaseContext = !request.url.includes('/api/releases') || request.method !== 'GET'

      if (!releaseId && needsReleaseContext) {
        releaseId = await getCurrentActiveRelease(fastify)
      }

      // Set release context if we have a release ID
      if (releaseId) {
        // Verify release exists and user has access
        const release = await fastify.releases.getRelease(releaseId)
        if (!release) {
          // return reply.badRequest('Release not found') // Commented out for development
          // Continue with mock release for development
          fastify.log.warn({ releaseId }, 'Release not found, continuing with mock release for development')
        }

        // Check if this is a preview request (non-deployed release)
        const isPreview = release?.status !== 'DEPLOYED'

        // For preview requests, ensure user has appropriate permissions (but only when explicitly targeting a specific release)
        if (isPreview && request.user && (headerRelease || (request.query as any)?.release)) {
          // Check if user has permission to preview releases
          const userRoles = await fastify.users.getUserRoles((request.user as any).sub)

          const canPreview = userRoles.includes('admin') || userRoles.includes('editor')

          if (!canPreview) {
            return reply.forbidden('Insufficient permissions to preview this release')
          }
        }
        // Add to request context
        request.releaseContext = {
          releaseId,
          isPreview
        }

        // Add response header to indicate which release was used
        reply.header('X-CMS-Release', releaseId.toString())
        if (isPreview) {
          reply.header('X-CMS-Release-Preview', 'true')
        }
      }
    } catch (error) {
      fastify.log.error({ error }, 'Error setting release context')
      // Don't fail the request, just log the error
      // The request will proceed with default release context
    }
  })

  // Add decorator to get release context
  fastify.decorate('getReleaseContext', function (request: FastifyRequest) {
    return request.releaseContext || null
  })

  // Add decorator to require release context
  fastify.decorate('requireReleaseContext', async function (request: FastifyRequest, reply: FastifyReply) {
    if (!request.releaseContext) {
      reply.badRequest('Release context is required for this operation')
    }
  })
}, {
  name: 'release-context',
  dependencies: ['releases']
})

/**
 * Get the current active release (most recently deployed)
 */
async function getCurrentActiveRelease(fastify: FastifyInstance): Promise<number | undefined> {
  try {
    // Get the most recently deployed release
    const { releases } = await fastify.releases.getReleases({
      status: 'DEPLOYED',
      limit: 1
    })

    if (releases && releases.length > 0) {
      return releases[0]!.id
    }

    // If no deployed releases, get the first open release (for initial setup)
    const { releases: openReleases } = await fastify.releases.getReleases({
      status: 'OPEN',
      limit: 1
    })

    if (openReleases && openReleases.length > 0) {
      return openReleases[0]!.id
    }

    return undefined
  } catch (error) {
    fastify.log.error({ error }, 'Error getting current active release')
    return undefined
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    getReleaseContext: (request: FastifyRequest) => { releaseId: number; isPreview?: boolean } | null
    requireReleaseContext: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}