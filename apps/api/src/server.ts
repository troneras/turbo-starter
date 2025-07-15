import { buildApp } from './app.js'
import { logger } from './lib/logger.js'

const start = async () => {
    try {
        const app = await buildApp()

        const port = app.config?.PORT || 3000
        const host = app.config?.HOST || '0.0.0.0'

        await app.listen({ port, host })

        logger.info(`Server listening on http://${host}:${port}`)

        // Graceful shutdown
        const signals = ['SIGINT', 'SIGTERM']
        signals.forEach(signal => {
            process.on(signal, async () => {
                logger.info(`Received ${signal}, shutting down gracefully...`)
                await app.close()
                process.exit(0)
            })
        })
    } catch (err) {
        logger.error(err)
        process.exit(1)
    }
}

start() 