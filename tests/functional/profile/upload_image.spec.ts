import { test } from '@japa/runner'
import { join } from 'node:path'
import { fileURLToPath } from 'url'
import { ApiClient } from '@japa/api-client'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const IMAGE_PATH: string = join(__dirname, '../../assets/image.png')

test.group('Profile Update', () => {
  async function getAuthToken(client: ApiClient) {
    const loginResponse = await client.post('/api/v1/login').json({
      email: 'admin@example.com',
      password: 'password',
    })
    return loginResponse.headers()['set-cookie'][0]
  }

  //test('successfully update profile with image', async ({ client, assert }) => {
  //  const token = await getAuthToken(client)
  //
  //  const response = await client
  //    .put('/api/v1/profile')
  //    .header('Cookie', token)
  //    .header('Content-Type', 'multipart/form-data')
  //    .file('profileImg', IMAGE_PATH)
  //    .field('name', 'John Doe')
  //    .field('phoneNumber', '1234567890')
  //
  //  response.assertStatus(200)
  //  response.assertBodyContains({ message: 'Profile updated successfully', status: 'success' })
  //
  //  const updatedProfile = await client.get('/api/v1/me').header('Cookie', token)
  //  assert.equal(updatedProfile.body().profile.name, 'Jane Doe')
  //  assert.equal(updatedProfile.body().profile.phoneNumber, '0987654321')
  //  assert.isNotNull(updatedProfile.body().profile.profileImg)
  //})

  test('successfully update profile without image', async ({ client, assert }) => {
    const token = await getAuthToken(client)

    const response = await client
      .put('/api/v1/profile')
      .header('Cookie', token)
      .header('Content-Type', 'application/json')
      .json({
        name: 'Jane Doe',
        phoneNumber: '0987654321',
      })

    response.assertStatus(200)
    response.assertBodyContains({ message: 'Profile updated successfully', status: 'success' })

    const updatedProfile = await client.get('/api/v1/me').header('Cookie', token)
    assert.equal(updatedProfile.body().profile.name, 'Jane Doe')
    assert.equal(updatedProfile.body().profile.phoneNumber, '0987654321')
  })

  test('fail to update profile with invalid data', async ({ client, assert }) => {
    const token = await getAuthToken(client)

    const response = await client
      .put('/api/v1/profile')
      .header('Cookie', token)
      .header('Content-Type', 'application/json')
      .json({
        name: null,
        phoneNumber: 'not-a-number',
      })

    response.assertStatus(400)
    assert.equal(response.body().message, 'Validation failed')
    //assert.isArray(response.body().errors)
    //const nameError = response.body().errors.find((err: any) => err.field === 'name')
    //assert.equal(nameError.message, 'Expected string, received null')
    //assert.equal(nameError.code, 'invalid_type')
    //
    //const phoneError = response.body().errors.find((err: any) => err.field === 'phoneNumber')
    //assert.exists(phoneError)
    //assert.include(phoneError.message.toLowerCase(), 'invalid')
  })

  test('fail to update profile with invalid image format', async ({ client }) => {
    const token = await getAuthToken(client)
    const INVALID_IMAGE_PATH = join(__dirname, '../../assets/invalid.txt')

    const response = await client
      .put('/api/v1/profile')
      .header('Cookie', token)
      .header('Content-Type', 'multipart/form-data')
      .file('profileImg', INVALID_IMAGE_PATH)
      .field('name', 'John Doe')
      .field('phoneNumber', '1234567890')

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Invalid image format' })
  })

  test('fail to update profile without authentication', async ({ client }) => {
    const response = await client
      .put('/api/v1/profile')
      .header('Content-Type', 'application/json')
      .json({
        name: 'John Doe',
        phoneNumber: '1234567890',
      })

    response.assertStatus(401)
    response.assertBodyContains({ message: 'User not authenticated' })
  })
})
