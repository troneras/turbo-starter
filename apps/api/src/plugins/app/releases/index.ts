import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { releasesRepositoryPlugin } from './releases-repository'
import releaseContextPlugin from './release-context'

export default fp(async function (fastify: FastifyInstance) {
  // Register the releases repository first
  await fastify.register(releasesRepositoryPlugin)
  
  // Then register the release context middleware
  await fastify.register(releaseContextPlugin)
}, {
  name: 'releases',
  dependencies: ['db']
})