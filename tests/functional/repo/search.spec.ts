import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'

test.group('Code Repo Search Controller - Search Operations', () => {

  async function loginAsUser(client: ApiClient) {
    const response = await client.post('/api/v1/login').json({
      email: 'normalUser@example.com',
      password: 'password',
    })
    return response.headers()['set-cookie'][0]
  }

  test('user can search repos with simple query', async ({ client, assert }) => {
    const userToken = await loginAsUser(client)
    const response = await client
      .get('/api/v1/repos/search')
      .header('Cookie', userToken)
      .qs({ query: 'test repo' })

    response.assertStatus(200)
    assert.properties(response.body(), ['data', 'meta'])
    assert.isArray(response.body().data)
    assert.isObject(response.body().meta)
    assert.properties(response.body().meta, ['total', 'page', 'pageSize', 'lastPage'])

    for (const repo of response.body().data) {
      assert.properties(repo, ['id', 'name', 'description', 'language', 'price', 'visibility', 'tags'])
      assert.isTrue(repo.name.toLowerCase().includes('test') || repo.description?.toLowerCase().includes('test'))
    }
  })

  test('user can search repos by tag', async ({ client, assert }) => {
    const userToken = await loginAsUser(client)
    const response = await client
      .get('/api/v1/repos/search')
      .header('Cookie', userToken)
      .qs({ tags: ['react'] })

    response.assertStatus(200)
    assert.properties(response.body(), ['data', 'meta'])
    assert.isArray(response.body().data)

    for (const repo of response.body().data) {
      assert.include(repo.tags, 'react')
    }
  })

  test('user can search repos with price range', async ({ client, assert }) => {
    const userToken = await loginAsUser(client)
    const response = await client
      .get('/api/v1/repos/search')
      .header('Cookie', userToken)
      .qs({ minPrice: 50, maxPrice: 100 })

    response.assertStatus(200)
    assert.properties(response.body(), ['data', 'meta'])
    assert.isArray(response.body().data)

    for (const repo of response.body().data) {
      assert.isAtLeast(repo.price, 50)
      assert.isAtMost(repo.price, 100)
    }
  })

  test('user can search repos by language', async ({ client, assert }) => {
    const userToken = await loginAsUser(client)
    const response = await client
      .get('/api/v1/repos/search')
      .header('Cookie', userToken)
      .qs({ language: 'JSX' })

    response.assertStatus(200)
    assert.properties(response.body(), ['data', 'meta'])
    assert.isArray(response.body().data)

    for (const repo of response.body().data) {
      assert.equal(repo.language, 'JSX')
    }
  })

  test('search returns only public repositories', async ({ client, assert }) => {
    const userToken = await loginAsUser(client)
    const response = await client
      .get('/api/v1/repos/search')
      .header('Cookie', userToken)

    response.assertStatus(200)
    assert.properties(response.body(), ['data', 'meta'])
    assert.isArray(response.body().data)

    for (const repo of response.body().data) {
      assert.equal(repo.visibility, 'public')
    }
  })

  test('search handles pagination correctly', async ({ client, assert }) => {
    const userToken = await loginAsUser(client)
    const pageSize = 5
    const page1Response = await client
      .get('/api/v1/repos/search')
      .header('Cookie', userToken)
      .qs({ page: 1, pageSize })

    const page2Response = await client
      .get('/api/v1/repos/search')
      .header('Cookie', userToken)
      .qs({ page: 2, pageSize })

    page1Response.assertStatus(200)
    page2Response.assertStatus(200)

    assert.equal(page1Response.body().data.length, pageSize)
    assert.equal(page2Response.body().data.length, pageSize)
    assert.notDeepEqual(page1Response.body().data, page2Response.body().data)
    assert.equal(page1Response.body().meta.page, 1)
    assert.equal(page2Response.body().meta.page, 2)
  })

  test('search returns empty array for non-existent criteria', async ({ client, assert }) => {
    const userToken = await loginAsUser(client)
    const response = await client
      .get('/api/v1/repos/search')
      .header('Cookie', userToken)
      .qs({ query: 'this repo definitely does not exist' })

    response.assertStatus(200)
    assert.properties(response.body(), ['data', 'meta'])
    assert.isEmpty(response.body().data)
    assert.equal(response.body().meta.total, 0)
  })

  test('search handles multiple criteria correctly', async ({ client, assert }) => {
    const userToken = await loginAsUser(client)
    const response = await client
      .get('/api/v1/repos/search')
      .header('Cookie', userToken)
      .qs({
        query: 'react',
        tags: ['component'],
        minPrice: 10,
        maxPrice: 1000,
        language: 'TSX'
      })

    response.assertStatus(200)
    assert.properties(response.body(), ['data', 'meta'])
    assert.isArray(response.body().data)

    for (const repo of response.body().data) {
      assert.isTrue(
        repo.name.toLowerCase().includes('react') ||
        repo.description?.toLowerCase().includes('react')
      )
      assert.include(repo.tags, 'component')
      assert.isAtLeast(repo.price, 10)
      assert.isAtMost(repo.price, 1000)
      assert.equal(repo.language, 'TSX')
    }
  })

  test('search is case insensitive', async ({ client, assert }) => {
    const userToken = await loginAsUser(client)
    const lowerCaseResponse = await client
      .get('/api/v1/repos/search')
      .header('Cookie', userToken)
      .qs({ query: 'react' })

    const upperCaseResponse = await client
      .get('/api/v1/repos/search')
      .header('Cookie', userToken)
      .qs({ query: 'REACT' })

    lowerCaseResponse.assertStatus(200)
    upperCaseResponse.assertStatus(200)

    assert.deepEqual(lowerCaseResponse.body(), upperCaseResponse.body())
  })

  //test('unauthenticated user cannot access search', async ({ client, assert }) => {
  //  const response = await client.get('/api/v1/repos/search')
  //  response.assertStatus(401)
  //  assert.properties(response.body(), ['message'])
  //  assert.equal(response.body().message, 'Authentication required')
  //})
})
