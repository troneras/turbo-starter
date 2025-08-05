import { it, describe, expect, afterEach, beforeEach } from 'bun:test'
import { build } from '../../../helpers/build-app'

describe('Users API', () => {
    let app: any

    beforeEach(async () => {
        app = await build()
        await app.ready()
    })

    afterEach(async () => {
        if (app) {
            await app.close()
        }
    })

    describe('GET /api/users', () => {
        it('should list users successfully', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/users',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('users')
            expect(response).toHaveProperty('total')
        })

    })

    describe('POST /api/users', () => {
        it('should create user successfully', async () => {
            const timestamp = Date.now()
            const newUser = {
                email: `newuser-${timestamp}@example.com`,
                name: 'New User',
                roles: ['user']
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/users',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: newUser
            })

            expect(res.statusCode).toBe(201)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('id')
            expect(response.email).toBe(newUser.email)
            expect(response.name).toBe(newUser.name)
        })
    })
})