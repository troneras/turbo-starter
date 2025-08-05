import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { translationsPlugin } from './translations-repository'

export default fp(async function (fastify: FastifyInstance) {
  // Register repository
  await fastify.register(translationsPlugin)
}, {
  name: 'translations',
  dependencies: ['db', 'releases', 'entity-service']
})