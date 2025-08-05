import { build } from './apps/api/test/helpers/build-app'

const app = await build()
await app.ready()

try {
  const res = await app.inject({
    method: 'GET',
    url: '/api/translations/keys',
    headers: {
      authorization: 'Bearer mock-admin-jwt-token'
    }
  })

  console.log('Status:', res.statusCode)
  console.log('Body:', res.payload)
} catch (error) {
  console.error('Error:', error)
} finally {
  await app.close()
}