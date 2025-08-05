import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

// Import plugins in order
import permissionsRepository from './permissions-repository'
import permissionRegistry from './permission-registry'

// Re-export for convenience
export { permissionsRepository, permissionRegistry }

export default fp(async function (fastify: FastifyInstance) {
    // Register permissions repository first
    await fastify.register(permissionsRepository)
    
    // Then register the permission registry
    await fastify.register(permissionRegistry)
}, {
    name: 'permissions',
    dependencies: ['db', 'auth']
})