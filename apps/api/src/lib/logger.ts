import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    ...(isDevelopment && {
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
                colorize: true,
                singleLine: false
            }
        }
    }),
    ...(isProduction && {
        formatters: {
            level: (label) => {
                return { level: label.toUpperCase() }
            }
        },
        timestamp: pino.stdTimeFunctions.isoTime,
    })
})

export type Logger = typeof logger 