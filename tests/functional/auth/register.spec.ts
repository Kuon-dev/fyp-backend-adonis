import { test } from '@japa/runner'
//import { ApiClient } from '@japa/api-client'

test.group('Auth Controller - Register', () => {
  test('successfully register a new user', async ({ client, assert }) => {
    const randomEmail = `${Math.random().toString(36).substring(7)}@example.com`
    const response = await client.post('/api/v1/register').json({
      email: randomEmail,
      password: '@v3ryS3cr3tP@ssw0rd',
      fullname: 'New User',
    })

    response.assertStatus(201)
    response.assertBodyContains({ message: 'Registration successful' })
    assert.exists(response.headers()['set-cookie'])
  })

  test('fail to register with existing email', async ({ client }) => {
    // First, register a user
    await client.post('/api/v1/register').json({
      email: 'existinguser@example.com',
      password: 'password123',
      fullname: 'Existing User',
    })

    // Try to register again with the same email
    const response = await client.post('/api/v1/register').json({
      email: 'existinguser@example.com',
      password: '@v3ryS3cr3tP@ssw0rd',
      fullname: 'Another User',
    })

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Email is already in use' })
  })

  test('fail to register with invalid data', async ({ client, assert }) => {
    const response = await client.post('/api/v1/register').json({
      email: 'invalidemail',
      password: '123', // too short
      fullname: '',
    })

    response.assertStatus(400)
    assert.isArray(response.body().message)
    assert.lengthOf(response.body().message, 4)

    const errors = response.body().message
    assert.deepInclude(errors, {
      code: 'invalid_string',
      message: 'Invalid email address',
      path: ['email'],
    })
    assert.deepInclude(errors, {
      code: 'too_small',
      message: 'Password must be at least 8 characters long',
      path: ['password'],
    })
    assert.deepInclude(errors, {
      code: 'invalid_string',
      message: 'Password must contain at least one letter',
      path: ['password'],
    })
    assert.deepInclude(errors, {
      code: 'invalid_type',
      message: 'Expected string, received null',
      path: ['fullname'],
    })
  })
})
