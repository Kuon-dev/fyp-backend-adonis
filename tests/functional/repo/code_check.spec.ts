import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
import { prisma } from '#services/prisma_service'
import { CodeRepoStatus, Language } from '@prisma/client'

test.group('Repo Submit Code Check', () => {
  async function getUserToken(client: ApiClient, email: string): Promise<string> {
    const loginResponse = await client.post('/api/v1/login').json({
      email,
      password: 'password',
    })
    return loginResponse.headers()['set-cookie'][0]
  }

  test('successfully submit code check for a repo', async ({ client, assert }) => {
    // Get the normal user from the database
    const user = await prisma.user.findUnique({ where: { email: 'normalUser@example.com' } })
    if (!user) throw new Error('Test user not found')

    const userToken = await getUserToken(client, 'normalUser@example.com')

    // Create a test repo
    const repo = await prisma.codeRepo.create({
      data: {
        name: 'Test Repo',
        description: 'Test Description',
        sourceJs: 'console.log("Hello World")',
        sourceCss: 'body { color: red; }',
        language: Language.JSX,
        price: 1000,
        userId: user.id,
        status: CodeRepoStatus.pending,
        visibility: 'private',
      },
    })

    try {
      const response = await client
        .post(`/api/v1/repo/${repo.id}/check`)
        .header('Cookie', userToken)

      response.assertStatus(200)
      assert.properties(response.body(), ['id', 'name', 'description', 'language', 'status'])
      assert.equal(response.body().id, repo.id)
      assert.equal(response.body().status, CodeRepoStatus.pending)

      const codeCheck = await prisma.codeCheck.findFirst({
        where: { repoId: repo.id },
      })
      assert.isNotNull(codeCheck)
    } finally {
      // Clean up: First delete the CodeCheck, then the CodeRepo
      await prisma.codeCheck.deleteMany({ where: { repoId: repo.id } })
      await prisma.codeRepo.delete({ where: { id: repo.id } })
    }
  })

  test('fail to submit code check for non-existent repo', async ({ client, assert }) => {
    const user = await prisma.user.findUnique({ where: { email: 'normalUser@example.com' } })
    if (!user) throw new Error('Test user not found')

    const userToken = await getUserToken(client, 'normalUser@example.com')

    const response = await client
      .post(`/api/v1/repo/non-existent-id/check`)
      .header('Cookie', userToken)

    response.assertStatus(404)
    assert.equal(response.body().message, 'Repo not found')
  })

  test('fail to submit code check without authentication', async ({ client, assert }) => {
    const user = await prisma.user.findUnique({ where: { email: 'normalUser@example.com' } })
    if (!user) throw new Error('Test user not found')

    const repo = await prisma.codeRepo.create({
      data: {
        name: 'Test Repo',
        description: 'Test Description',
        sourceJs: 'console.log("Hello World")',
        sourceCss: 'body { color: red; }',
        language: Language.JSX,
        price: 1000,
        userId: user.id,
        status: CodeRepoStatus.pending,
        visibility: 'private',
      },
    })

    try {
      const response = await client.post(`/api/v1/repo/${repo.id}/check`)

      response.assertStatus(401)
      assert.equal(response.body().message, 'User not authenticated')
    } finally {
      // Clean up: Delete the CodeRepo (no CodeCheck should have been created)
      await prisma.codeRepo.delete({ where: { id: repo.id } })
    }
  })
})
