import Fastify, { type FastifyInstance } from 'fastify'
import autoload from '@fastify/autoload'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { getLoggerConfig } from './lib/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

export async function buildApp(opts = {}): Promise<FastifyInstance> {
    const app = Fastify({
        logger: getLoggerConfig(),
        ...opts
    })

    // Register external plugins (infrastructure)
    await app.register(autoload, {
        dir: join(__dirname, 'plugins', 'external'),
        options: { prefix: '/external' }
    })

    // Register application plugins (business logic)
    await app.register(autoload, {
        dir: join(__dirname, 'plugins', 'app'),
        options: { prefix: '/app' }
    })

    // Register routes
    await app.register(autoload, {
        dir: join(__dirname, 'routes'),
        options: { prefix: '/' }
    })

    return app
} 