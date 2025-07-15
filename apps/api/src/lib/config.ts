import { FastifyInstance } from 'fastify'

export const envSchema = {
    type: 'object',
    required: ['DATABASE_URL', 'JWT_SECRET'],
    properties: {
        NODE_ENV: {
            type: 'string',
            default: 'development'
        },
        PORT: {
            type: 'number',
            default: 3000
        },
        HOST: {
            type: 'string',
            default: '0.0.0.0'
        },
        DATABASE_URL: {
            type: 'string'
        },
        REDIS_URL: {
            type: 'string',
            default: 'redis://localhost:6379'
        },
        JWT_SECRET: {
            type: 'string'
        },
        JWT_EXPIRES_IN: {
            type: 'string',
            default: '7d'
        },
        LOG_LEVEL: {
            type: 'string',
            default: 'info'
        },
        CORS_ORIGIN: {
            type: 'string',
            default: '*'
        },
        RATE_LIMIT_MAX: {
            type: 'number',
            default: 100
        },
        RATE_LIMIT_WINDOW: {
            type: 'string',
            default: '1 minute'
        }
    }
}

export interface AppConfig {
    NODE_ENV: string
    PORT: number
    HOST: string
    DATABASE_URL: string
    REDIS_URL: string
    JWT_SECRET: string
    JWT_EXPIRES_IN: string
    LOG_LEVEL: string
    CORS_ORIGIN: string
    RATE_LIMIT_MAX: number
    RATE_LIMIT_WINDOW: string
}

declare module 'fastify' {
    interface FastifyInstance {
        config: AppConfig
    }
} 