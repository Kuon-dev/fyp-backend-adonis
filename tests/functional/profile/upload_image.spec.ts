import { test } from '@japa/runner'
import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import NodeFormData from 'form-data'
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const IMAGE_PATH: string = join(__dirname, '../../assets/image.png');


test.group('Profile Image Upload', (group) => {

  test('successfully upload profile image', async ({ client, assert }) => {
    // Login to get authentication token
    const loginResponse = await client.post('/api/v1/login').json({
      email: 'admin@example.com',
      password: 'password'
    })
    const token = loginResponse.headers()['set-cookie'][0]

    // Create a mock image file
    const form = new NodeFormData()
    form.append('profileImg', createReadStream(IMAGE_PATH))

    // Send request to upload profile image
    const response = await client
      .put('/api/v1/profile')
      .header('Cookie', token)
      .header('Content-Type', 'multipart/form-data')
      .file('profileImg', IMAGE_PATH)

     //Assert response
    response.assertStatus(200)
    const body = response.body()
    //assert.property(body.status, 'success')
    //assert.include(body.profile.profileImg, 'https://')
    //assert.property(body, 'signedUrl')
    //assert.include(body.signedUrl, 'https://')
  });

  test('successfully update user phone number even with no image', async ({ client }) => {
    // Login to get authentication token
    const loginResponse = await client.post('/api/v1/login').json({
      email: 'admin@example.com',
      password: 'password'
    })
    const token = loginResponse.headers()['set-cookie'][0]
    const form = new NodeFormData()
    form.append('phoneNumber', '1234567890')

    // Send request without a file
    const response = await client
      .put('/api/v1/profile')
      .header('Cookie', token)
      .header('Content-Type', 'multipart/form-data')
      .form(form)

    // Assert response
    response.assertStatus(200)
  });

  //test('fail to upload when user is not authenticated', async ({ client }) => {
  //  // Create a mock image file
  //  const form = new formData()
  //  form.append('profileImg', createReadStream(IMAGE_PATH))
  //
  //  // Send request without authentication
  //  const response = await client
  //    .post('/profile/image')
  //    .header('Content-Type', 'multipart/form-data')
  //    .form(form)
  //
  //  // Assert response
  //  response.assertStatus(401)
  //});
});
