import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { translationsRepositoryPlugin } from './translations-repository'

export default fp(async function (fastify: FastifyInstance) {
  // Register repository
  await fastify.register(translationsRepositoryPlugin)
}, {
  name: 'translations',
  dependencies: ['db', 'releases']
})