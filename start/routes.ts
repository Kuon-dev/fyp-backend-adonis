
/*
|--------------------------------------------------------------------------
| routers file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const RepoController = () => import('#controllers/repos_controller')
const SupportController = () => import('#controllers/supports_controller')
const UserController = () => import('#controllers/users_controller')

router
  .group(() => {
    router
      .group(() => {
        // Auth routes
        router.post('/login', [AuthController, 'login']);
        router.post('/register', [AuthController, 'register']);
        router.post('/logout', [AuthController, 'logout']);
        router.post('/forgot-password', [AuthController, 'createPasswordResetToken']);
        router.post('/reset-password', [AuthController, 'resetPassword']);
        router.post('/verify-email', [AuthController, 'verifyEmail']);

        // Support routes
        router.post('/support/ticket', [SupportController, 'createTicket']);
        router.get('/support/tickets', [SupportController, 'getAllTickets']).use(middleware.auth());
        router.get('/support/tickets/paginated', [SupportController, 'getPaginatedTickets']);
        router.get('/support/ticket/:id', [SupportController, 'getTicketById']);
        router.get('/support/tickets/title', [SupportController, 'getTicketsByTitle']);
        router.get('/support/tickets/email', [SupportController, 'getTicketsByEmail']);
        router.get('/support/tickets/status', [SupportController, 'getTicketsByStatus']);
        router.put('/support/ticket/:id', [SupportController, 'updateTicket']);
        router.post('/support/email', [SupportController, 'sendDefaultEmail']);

        // Repo routes
        router.post('/repos', [RepoController, 'create']);
        router.get('/repos/:id', [RepoController, 'getById']);
        router.put('/repos/:id', [RepoController, 'update']);
        router.delete('/repos/:id', [RepoController, 'delete']);
        router.get('/repos', [RepoController, 'getPaginated']);
        router.get('/repos/search', [RepoController, 'search']);
        router.get('/repos/user/:userId', [RepoController, 'getByUser']);
        router.get('/repos/all', [RepoController, 'getAll']);

        // User routes
        router.post('/users', [UserController, 'create']);
        router.get('/users/:email', [UserController, 'getByEmail']);
        router.put('/users/:email', [UserController, 'update']);
        router.delete('/users/:email', [UserController, 'delete']);
        router.get('/users', [UserController, 'getAll']);
        router.get('/users/paginated', [UserController, 'getPaginated']);
        router.put('/users/:email/profile', [UserController, 'updateProfile']);
      })
      .prefix('v1');
  })
  .prefix('api');

