import { build } from './apps/api/test/helpers/build-app.js'

const app = await build()
await app.ready()

console.log('App ready, testing simple route...')

// Test a simple route first
const healthRes = await app.inject({
  method: 'GET',
  url: '/health'
})
console.log('Health check:', healthRes.statusCode, healthRes.payload)

// Test brands route (we know this works)
const brandsRes = await app.inject({
  method: 'GET',
  url: '/api/brands',
  headers: {
    authorization: 'Bearer mock-admin-jwt-token'
  }
})
console.log('Brands route:', brandsRes.statusCode, brandsRes.payload.substring(0, 100))

// Now test translations route
try {
  const translationsRes = await app.inject({
    method: 'GET',
    url: '/api/translations/keys',
    headers: {
      authorization: 'Bearer mock-admin-jwt-token'
    }
  })
  console.log('Translations route:', translationsRes.statusCode, translationsRes.payload.substring(0, 200))
} catch (error) {
  console.error('Translations route error:', error.message)
}

await app.close()