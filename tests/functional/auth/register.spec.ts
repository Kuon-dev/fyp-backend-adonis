import { test } from '@japa/runner'

test.group('Auth Controller - Register', () => {
  test('successfully register a new buyer user', async ({ client, assert }) => {
    const randomEmail = `${Math.random().toString(36).substring(7)}@example.com`
    const response = await client.post('/api/v1/register').json({
      email: randomEmail,
      password: '@v3ryS3cr3tP@ssw0rd',
      fullname: 'New User',
      userType: 'buyer'
    })
    response.assertStatus(201)
    response.assertBodyContains({ 
      message: 'Registration successful',
      user: {
        email: randomEmail,
        role: 'USER'
      }
    })
    assert.exists(response.headers()['set-cookie'])
  })

  test('successfully register a new seller user', async ({ client, assert }) => {
    const randomEmail = `${Math.random().toString(36).substring(7)}@example.com`
    const response = await client.post('/api/v1/register').json({
      email: randomEmail,
      password: '@v3ryS3cr3tP@ssw0rd',
      fullname: 'New Seller',
      userType: 'seller'
    })
    response.assertStatus(201)
    response.assertBodyContains({ 
      message: 'Registration successful',
      user: {
        email: randomEmail,
        role: 'SELLER'
      }
    })
    assert.exists(response.headers()['set-cookie'])
  })

  test('fail to register with existing email', async ({ client }) => {
    const email = 'existinguser@example.com'
    // First, register a user
    await client.post('/api/v1/register').json({
      email,
      password: 'password123',
      fullname: 'Existing User',
      userType: 'buyer'
    })
    // Try to register again with the same email
    const response = await client.post('/api/v1/register').json({
      email,
      password: '@v3ryS3cr3tP@ssw0rd',
      fullname: 'Another User',
      userType: 'seller'
    })
    response.assertStatus(400)
    response.assertBodyContains({ message: 'Email is already in use' })
  })

  test('fail to register with invalid data', async ({ client, assert }) => {
    const response = await client.post('/api/v1/register').json({
      email: 'invalidemail',
      password: '123', // too short
      fullname: '',
      userType: 'invalid'
    })
    response.assertStatus(400)
    assert.isArray(response.body().message)
    assert.lengthOf(response.body().message, 5) // Now checking for 5 errors
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
    assert.deepInclude(errors, {
      code: 'invalid_enum_value',
      message: 'Invalid enum value. Expected \'buyer\' or \'seller\'',
      path: ['userType'],
    })
  })

  test('fail to register without userType', async ({ client }) => {
    const response = await client.post('/api/v1/register').json({
      email: 'validemail@example.com',
      password: '@v3ryS3cr3tP@ssw0rd',
      fullname: 'Valid Name'
    })
    response.assertStatus(400)
    response.assertBodyContains({ 
      message: [
        {
          code: 'invalid_type',
          message: 'Required',
          path: ['userType']
        }
      ] 
    })
  })
})
