import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify'
import { build as buildApplication } from 'fastify-cli/helper.js'
import path from 'node:path'
import type { TestContext } from 'node:test'
import { options as serverOptions } from '../../src/app.js'
import assert from 'node:assert'
import { setupTestDatabase, closeTestDb } from './db.js'



const AppPath = path.join(import.meta.dirname, '../../src/app.ts')

// Fill in this config with all the configurations
// needed for testing the application
export function config() {
    return {
        skipOverride: true // Register our application with fastify-plugin
    }
}

// Set test environment variables
function setTestEnv() {
    // Use the main DATABASE_URL for tests - no separate test database
    // Don't override DATABASE_URL if it's already set

    // Set other required test environment variables
    if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = "test_jwt_secret_for_testing_only"
    }

    if (!process.env.REDIS_URL) {
        process.env.REDIS_URL = "redis://localhost:6379"
    }

    // Also set NODE_ENV to test if not already set
    if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = "test"
    }

    // Set TEST_MODE for test authentication
    process.env.TEST_MODE = "true"
}

export function expectValidationError(res: LightMyRequestResponse, expectedMessage: string) {
    assert.strictEqual(res.statusCode, 400)
    const { message } = JSON.parse(res.payload)
    assert.strictEqual(message, expectedMessage)
}



// automatically build and tear down our instance
export async function build(t?: TestContext, options: { cleanDb?: boolean } = {}) {
    // Set test environment variables
    setTestEnv()

    // you can set all the options supported by the fastify CLI command
    const argv = [AppPath]

    // fastify-plugin ensures that all decorators
    // are exposed for testing purposes, this is
    // different from the production setup
    const app = (await buildApplication(
        argv,
        config(),
        serverOptions
    )) as FastifyInstance

    // Clean and setup test database if requested (default: true)
    if (options.cleanDb !== false) {
        await setupTestDatabase()
    }

    // This is after start, so we can't decorate the instance using `.decorate`
    // app.login = login
    // app.injectWithLogin = injectWithLogin

    // If we pass the test contest, it will close the app after we are done
    if (t) {
        t.after(async () => {
            await app.close()
            await closeTestDb()
        })
    }

    return app
}

// Helper function for tests that need to build app without cleaning database
export async function buildWithoutCleanDb(t?: TestContext) {
    return build(t, { cleanDb: false })
}