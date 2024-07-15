/*
|--------------------------------------------------------------------------
| routers file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { prisma } from '#services/prisma_service'
import { middleware } from '#start/kernel'
import AutoSwagger from 'adonis-autoswagger'
import swagger from '#config/swagger'

const AuthController = () => import('#controllers/auth_controller')
const RepoController = () => import('#controllers/repos_controller')
const SupportController = () => import('#controllers/supports_controller')
const UserController = () => import('#controllers/users_controller')
const OrderController = () => import('#controllers/orders_controller')
const CheckoutController = () => import('#controllers/checkout_controller')
const CodeCheckController = () => import('#controllers/code_checks_controller')
const HealthChecksController = () => import('#controllers/health_checks_controller')
const ReviewController = () => import('#controllers/reviews_controller')
const CommentController = () => import('#controllers/comments_controller')
const ProfileController = () => import('#controllers/profile_controller')

const AdminController = () => import('#controllers/admin_controller')
const SellerController = () => import('#controllers/seller_controller')

const PayoutRequestController = () => import('#controllers/payout_request_controller')

router.get('/', async () => {
  const users = await prisma.user.findMany()
  return {
    hello: 'world',
    users,
  }
})

router
  .group(() => {
    router
      .group(() => {
        // Auth routes
        router.post('/login', [AuthController, 'login'])
        router.post('/register', [AuthController, 'register'])
        router.post('/logout', [AuthController, 'logout']).use(middleware.auth({ role: 'USER' }))
        router.post('/forgot-password', [AuthController, 'createPasswordResetToken'])
        router.post('/reset-password', [AuthController, 'resetPassword'])
        router.post('/verify-email', [AuthController, 'verifyEmail'])
        router
          .post('/send-verify-code', [AuthController, 'sendVerifyEmailCodeFromUser'])
        router.get('/me', [AuthController, 'me'])

        router
          .put('/profile', [ProfileController, 'updateProfile'])
          .use(middleware.auth({ role: 'USER' }))

        // Support routes
        router.post('/support/ticket', [SupportController, 'createTicket'])
        router
          .get('/support/tickets', [SupportController, 'getAllTickets'])
          .use(middleware.auth({ role: 'ADMIN' }))
        router.get('/support/tickets/paginated', [SupportController, 'getPaginatedTickets'])
        router.get('/support/ticket/:id', [SupportController, 'getTicketById'])
        router.get('/support/tickets/title', [SupportController, 'getTicketsByTitle'])
        router.get('/support/tickets/email', [SupportController, 'getTicketsByEmail'])
        router.get('/support/tickets/status', [SupportController, 'getTicketsByStatus'])
        router.put('/support/ticket/:id', [SupportController, 'updateTicket'])
        router.post('/support/email', [SupportController, 'sendDefaultEmail'])

        // Repo routes
        router.post('/repos', [RepoController, 'create'])
        router.get('/repo/:id', [RepoController, 'getById'])
        router.get('/repo/:id/public', [RepoController, 'getByIdPublic'])

        // comments
        router.get('/repo/:repoId/reviews/:reviewId', [CommentController, 'getCommentsByReview'])
        router.get('/repo/:id/reviews', [ReviewController, 'getPaginatedReviewsByRepo'])

        router.put('/repo/:id', [RepoController, 'update'])
        router.delete('/repo/:id', [RepoController, 'delete'])
        router.get('/repos', [RepoController, 'getPaginated'])
        router.get('/repos/search', [RepoController, 'search'])
        router.get('/repos/user/:userId', [RepoController, 'getByUser'])
        router
          .get('/repos/user', [RepoController, 'getByUserSession'])
          .use(middleware.auth({ role: 'USER' }))

        router.get('/repos/all', [RepoController, 'getAll'])
        router.get('/repos/featured', [RepoController, 'getFeatured'])

        // admin routes
        router.put('/admin/seller-profile/:email', [AdminController, 'updateSellerProfile']).use(middleware.auth({ role: 'ADMIN' }))
        router.post('/admin/:email/ban', [AdminController, 'banUser']).use(middleware.auth({ role: 'ADMIN' }))
        router.post('/admin/:email/unban', [AdminController, 'unbanUser']).use(middleware.auth({ role: 'ADMIN' }))
        router.delete('/admin/:email', [AdminController, 'deleteUser']).use(middleware.auth({ role: 'ADMIN' }))
        router.get('/admin/reviews', [AdminController, 'getAllFlaggedReviews'])

        // User routes
        router.post('/users', [UserController, 'create'])
        router.get('/users/:email', [UserController, 'getByEmail'])
        router.put('/users/:email', [UserController, 'update'])
        router.delete('/users/:email', [UserController, 'delete'])
        router.get('/users', [UserController, 'getAll'])
        router.get('/users/paginated', [UserController, 'getPaginated'])
        router.put('/users/:email/profile', [UserController, 'updateProfile'])

        // Order routes
        router.post('/orders', [OrderController, 'create'])
        router.get('/orders', [OrderController, 'getAll'])
        router.get('/orders/:id', [OrderController, 'getById'])
        router.get('/users/:userId/orders', [OrderController, 'getByUser'])
        router.put('/orders/:id', [OrderController, 'update'])
        router.delete('/orders/:id', [OrderController, 'delete'])
        router.get('/orders/status/:status', [OrderController, 'getByStatus'])
        router.get('/users/:userId/orders/status/:status', [
          OrderController,
          'getUserOrdersByStatus',
        ])
        router.get('/orders/search', [OrderController, 'searchOrders'])

      router
        .group(() => {
          router.post('/', [PayoutRequestController, 'create'])
          router.get('/:id', [PayoutRequestController, 'getById'])
          router.put('/:id', [PayoutRequestController, 'update'])
          router.delete('/:id', [PayoutRequestController, 'delete'])
          router.get('/', [PayoutRequestController, 'getPaginated'])
          router.get('/user/current', [PayoutRequestController, 'getCurrentUserPayoutRequests'])
          router.post('/:id/process', [PayoutRequestController, 'processPayoutRequest'])
            .use(middleware.auth({ role: 'ADMIN' }))
        })
        .prefix('/payout-requests')
        .use(middleware.auth({ role: 'USER' }))

          // Seller-specific routes
          router.group(() => {
            // Apply to become a seller
            router.post('/apply', [SellerController, 'applyForSellerAccount'])
            // Update seller's own profile
            router.put('/profile', [SellerController, 'updateProfile'])
            // Get application status
            //router.get('/application-status', [SellerController, 'getApplicationStatus'])
            // Update bank details
            //router.put('/bank-details', [SellerController, 'updateBankDetails'])
            // Get seller's balance
            //router.get('/balance', [SellerController, 'getBalance'])
            // Request a payout
            //router.post('/payout-request', [SellerController, 'requestPayout'])
            // Get payout history
            //router.get('/payout-history', [SellerController, 'getPayoutHistory'])
            // Upload or update identity document
            router.post('/identity-document', [SellerController, 'uploadIdentityDocument'])

          })
          .prefix('/seller')
          .use(middleware.auth({ role: 'SELLER' }))

        router.post('/checkout', [CheckoutController, 'createPaymentIntent'])
        router.get('/checkout/:sessionId', [CheckoutController, 'getPaymentIntent'])

        router.post('/code-analysis/public', [CodeCheckController, 'publicCheckCode'])
        router
          .post('/code-analysis', [CodeCheckController, 'checkAndStoreCode'])
          .use(middleware.auth({ role: 'USER' }))
        router.get('/code-analysis/{id}', [CodeCheckController, 'getCodeCheck'])

        // Health Check routes
        router.get('/health', [HealthChecksController])
        router.get('/ping', async () => {
          return {
            message: 'pong',
            // time interval to calculate response time
            time: Date.now(),
          }
        })

        // Review routes
        router.post('/reviews', [ReviewController, 'create'])
        router.get('/reviews/:id', [ReviewController, 'getById'])
        router.put('/reviews/:id', [ReviewController, 'update'])
        router.put('/reviews/:id/revert', [ReviewController, 'revertFlag'])
        router.delete('/reviews/:id', [ReviewController, 'delete'])
        //router.get('/reviews', [ReviewController, 'getAll'])
        router.post('/reviews/:id/:vote', [ReviewController, 'handleVote'])

        // Comment routes
        router.post('/comments', [CommentController, 'create'])
        router.get('/comments/:id', [CommentController, 'getById'])
        router.put('/comments/:id', [CommentController, 'update'])
        router.put('/comments/:id/revert', [CommentController, 'revertFlag'])
        router.delete('/comments/:id', [CommentController, 'delete'])
        router.get('/comments', [CommentController, 'getAll'])
        router.post('/comments/:id/:vote', [CommentController, 'handleVote'])
      })
      .prefix('v1')
  })
  .prefix('api')

// returns swagger in YAML
router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
})

// Renders Swagger-UI and passes YAML-output of /swagger
router.get('/docs', async () => {
  return AutoSwagger.default.ui('/swagger', swagger)
  // return AutoSwagger.default.scalar("/swagger", swagger); to use Scalar instead
  // return AutoSwagger.default.rapidoc("/swagger", swagger); to use RapiDoc instead
})
