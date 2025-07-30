import { it, describe, expect, afterEach, beforeEach } from 'bun:test'
import { build } from '../../../helpers/build-app'

describe('Users API - Simple Permission Test', () => {
    let app: any

    beforeEach(async () => {
        app = await build()
        await app.ready()
        
        // The mock users already exist in the auth plugin
        // No need to create them in the database
    })

    afterEach(async () => {
        if (app) {
            await app.close()
        }
    })

    describe('GET /api/users', () => {
        it('should list users successfully with admin token', async () => {
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

        it('should return 403 for non-admin user', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/users',
                headers: {
                    authorization: 'Bearer mock-user-jwt-token'
                }
            })

            expect(res.statusCode).toBe(403)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
            expect(response.error).toBe('Forbidden')
        })

        it('should return 401 without authentication token', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/users'
            })

            expect(res.statusCode).toBe(401)
        })
    })

    describe('POST /api/users', () => {
        it('should create user successfully with admin token', async () => {
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

        it('should return 403 for non-admin user', async () => {
            const timestamp = Date.now()
            const newUser = {
                email: `forbidden-${timestamp}@example.com`,
                name: 'Forbidden User',
                roles: ['user']
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/users',
                headers: {
                    authorization: 'Bearer mock-user-jwt-token'
                },
                payload: newUser
            })

            expect(res.statusCode).toBe(403)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
            expect(response.error).toBe('Forbidden')
        })
    })

    describe('DELETE /api/users/:id', () => {
        it('should return 403 for non-admin user', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: '/api/users/some-user-id',
                headers: {
                    authorization: 'Bearer mock-user-jwt-token'
                }
            })

            expect(res.statusCode).toBe(403)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
            expect(response.error).toBe('Forbidden')
        })
    })
})