import { getLoggerConfig } from './lib/logger.js'
import serviceApp, { options } from './app.js'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import closeWithGrace from 'close-with-grace'

const app = Fastify({
    logger: getLoggerConfig(),
    ...options
})

const init = async () => {

    app.register(fp(serviceApp))

    // Delay is the number of milliseconds for the graceful close to finish
    closeWithGrace(
        { delay: Number(process.env.FASTIFY_CLOSE_GRACE_DELAY) || 500 },
        async ({ err }) => {
            if (err != null) {
                app.log.error(err)
            }

            await app.close()
        }
    )

    await app.ready()

    try {
        // Start listening.
        await app.listen({ port: Number(process.env.PORT) || 3000 })
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }

}

init() 