import type { FastifyInstance } from 'fastify'

export default async function (fastify: FastifyInstance) {
  // Test endpoint to debug auth
  fastify.get('/test-auth', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    return {
      user: request.user,
      testMode: process.env.TEST_MODE,
      nodeEnv: process.env.NODE_ENV
    }
  })

  // Test endpoint with role check
  fastify.get('/test-auth/editor', {
    onRequest: [
      fastify.authenticate,
      fastify.requireRole('editor')
    ]
  }, async (request, reply) => {
    return {
      success: true,
      user: request.user
    }
  })

  // Test endpoint with admin role check
  fastify.get('/test-auth/admin', {
    onRequest: [
      fastify.authenticate,
      fastify.requireRole('admin')
    ]
  }, async (request, reply) => {
    return {
      success: true,
      user: request.user
    }
  })
}