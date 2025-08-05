import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { releasesRepositoryPlugin } from './releases-repository'
import releaseContextPlugin from './release-context'

// System user UUID for automated operations (matches the one in seed.ts)
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

export default fp(async function (fastify: FastifyInstance) {
  // Register the releases repository first
  await fastify.register(releasesRepositoryPlugin)
  
  // Then register the release context middleware
  await fastify.register(releaseContextPlugin)
  
  // Ensure default release exists
  await fastify.ready(async () => {
    try {
      // Check if there's already a deployed release
      const deployedReleases = await fastify.releases.getReleases({ status: 'DEPLOYED', limit: 1 })
      
      if (deployedReleases.releases.length === 0) {
        // Create and deploy a default release
        fastify.log.info('Creating default release for system initialization')
        const defaultRelease = await fastify.releases.createRelease({
          name: 'Initial Release',
          description: 'System initialization release'
        }, SYSTEM_USER_ID)
        
        // Close and deploy the release
        await fastify.releases.updateRelease(defaultRelease.id, { status: 'CLOSED' })
        await fastify.releases.deployRelease(defaultRelease.id, SYSTEM_USER_ID)
        
        fastify.log.info(`Default release ${defaultRelease.id} created and deployed`)
      }
    } catch (error) {
      fastify.log.warn(error, 'Failed to ensure default release exists')
    }
  })
}, {
  name: 'releases',
  dependencies: ['db']
})