import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import AutoSwagger from 'adonis-autoswagger'
import swagger from '#config/swagger'

// Controller imports
const CheckoutController = () => import('#controllers/checkout_controller')
const AuthController = () => import('#controllers/auth_controller')
const RepoController = () => import('#controllers/repos_controller')
const SupportController = () => import('#controllers/supports_controller')
const UserController = () => import('#controllers/users_controller')
const CodeCheckController = () => import('#controllers/code_checks_controller')
const HealthChecksController = () => import('#controllers/health_checks_controller')
const ReviewController = () => import('#controllers/reviews_controller')
const CommentController = () => import('#controllers/comments_controller')
const ProfileController = () => import('#controllers/profile_controller')
const AdminController = () => import('#controllers/admin_controller')
const SellerController = () => import('#controllers/seller_controller')
const OrderController = () => import('#controllers/orders_controller')
const PayoutRequestController = () => import('#controllers/payout_request_controller')

// Root route
router.group(() => {
  router.group(() => {
    // Auth routes
    router.group(() => {
      router.post('/login', [AuthController, 'login'])
      router.post('/register', [AuthController, 'register'])
      router.post('/logout', [AuthController, 'logout'])
      router.post('/forgot-password', [AuthController, 'createPasswordResetToken'])
      router.post('/reset-password', [AuthController, 'resetPassword'])
      router.post('/verify-email', [AuthController, 'verifyEmail'])
      router.post('/send-verify-code', [AuthController, 'sendVerifyEmailCodeFromUser'])
      router.get('/me', [AuthController, 'me'])
    })

    // Profile routes
    router
      .put('/profile', [ProfileController, 'updateProfile'])
      .use(middleware.auth({ role: 'USER' }))

    // Support routes
    router.post('/support/ticket', [SupportController, 'createTicket'])
    router.group(() => {
      router.get('/tickets', [SupportController, 'getAllTickets'])
      //router.get('/tickets/paginated', [SupportController, 'getPaginatedTickets'])
      router.get('/tickets/title', [SupportController, 'getTicketsByTitle'])
      router.get('/tickets/email', [SupportController, 'getTicketsByEmail'])
      router.get('/tickets/status', [SupportController, 'getTicketsByStatus'])

      router.get('/ticket/:id', [SupportController, 'getTicketById'])
      router.put('/ticket/:id', [SupportController, 'updateTicket'])
      router.post('/email', [SupportController, 'sendDefaultEmail'])
    }).prefix('/support').use(middleware.auth({ role: 'ADMIN' }))

    // Repo routes
    router.group(() => {
      router.get('/user', [RepoController, 'getByUserSession']).use(middleware.auth({ role: 'USER' }))
      router.get('/featured', [RepoController, 'getFeatured'])
      router.get('/search', [RepoController, 'search'])
    }).prefix('/repos')

    // Comment routes
    router.get('/repo/:id', [RepoController, 'getById']).use(middleware.auth({ role: 'USER' }))
    router.delete('/repo/:id', [RepoController, 'delete']).use(middleware.auth({ role: 'USER' }))
    router.post('/repo', [RepoController, 'create']).use(middleware.auth({ role: 'USER' }))
    router.put('/repo/:id', [RepoController, 'update']).use(middleware.auth({ role: 'USER' }))

    router.get('/repo/:repoId/reviews/:reviewId', [CommentController, 'getCommentsByReview'])
    router.get('/repo/:id/reviews', [ReviewController, 'getPaginatedReviewsByRepo'])
    router.get('/repo/:id/public', [RepoController, 'getByIdPublic'])


    // Admin routes
    router.group(() => {
      router.put('/seller-profile/:email', [AdminController, 'updateSellerProfile'])
      router.post('/:email/ban', [AdminController, 'banUser'])
      router.post('/:email/unban', [AdminController, 'unbanUser'])
      router.delete('/:email', [AdminController, 'deleteUser'])
      router.get('/reviews', [AdminController, 'getAllFlaggedReviews'])
      router.get('/payout-requests', [PayoutRequestController, 'getAll'])
    })
      .prefix('/admin')
      .use(middleware.auth({ role: 'ADMIN' }))

    // User routes
    router.group(() => {
      router.post('/', [UserController, 'create'])
      router.get('/:email', [UserController, 'getByEmail'])
      router.put('/:email', [UserController, 'update'])
      router.delete('/:email', [UserController, 'delete'])
      router.get('/', [UserController, 'getAll'])
      router.get('/paginated', [UserController, 'getPaginated'])
      router.put('/:email/profile', [UserController, 'updateProfile'])
    }).prefix('/users')

    router.post('/checkout', [CheckoutController, 'initCheckout'])
    router.post('/checkout/process-payment', [CheckoutController, 'processPayment'])

    // Payout request routes
    router.group(() => {
      router.get('/:id', [PayoutRequestController, 'getById'])
      router.put('/:id', [PayoutRequestController, 'update'])
      router.delete('/:id', [PayoutRequestController, 'delete'])
      router.get('/user/current', [PayoutRequestController, 'getCurrentUserPayoutRequests'])
      router
        .post('/:id/process', [PayoutRequestController, 'processPayoutRequest'])
        .use(middleware.auth({ role: 'ADMIN' }))
    })
      .prefix('/payout-requests')
      .use(middleware.auth({ role: 'USER' }))

    // Seller routes
    router.group(() => {
      router.post('/apply', [SellerController, 'applyForSellerAccount'])
      router.get('/dashboard', [SellerController, 'getDashboardData'])
      router.put('/profile', [SellerController, 'updateProfile'])
      router.get('/balance', [PayoutRequestController, 'getSellerBalance'])
      router.get('/payout-requests', [PayoutRequestController, 'getCurrentUserPayoutRequests'])
      router.post('/payout-requests', [PayoutRequestController, 'create'])
    })
      .prefix('/seller')
      .use(middleware.auth({ role: 'SELLER' }))

    // Code analysis routes
    router.post('/code-analysis/public', [CodeCheckController, 'publicCheckCode'])
    router
      .post('/code-analysis', [CodeCheckController, 'checkAndStoreCode'])
      .use(middleware.auth({ role: 'USER' }))
    router.get('/code-analysis/{id}', [CodeCheckController, 'getCodeCheck'])

    // Health check routes
    router.get('/health', [HealthChecksController])

    // Review routes
    router.group(() => {
      router.post('/', [ReviewController, 'create'])
      router.get('/:id', [ReviewController, 'getById'])
      router.put('/:id', [ReviewController, 'update'])
      router.put('/:id/revert', [ReviewController, 'revertFlag'])
      router.delete('/:id', [ReviewController, 'delete'])
      router.post('/:id/:vote', [ReviewController, 'handleVote'])
    }).prefix('/reviews')

    // Comment routes
    router.group(() => {
      router.post('/', [CommentController, 'create'])
      router.get('/:id', [CommentController, 'getById'])
      router.put('/:id', [CommentController, 'update'])
      router.put('/:id/revert', [CommentController, 'revertFlag'])
      router.delete('/:id', [CommentController, 'delete'])
      router.get('/', [CommentController, 'getAll'])
      router.post('/:id/:vote', [CommentController, 'handleVote'])
    }).prefix('/comments')

    // orders
      router.group(() => {
        router.post('/', [OrderController, 'create'])
        router.get('/:id', [OrderController, 'show'])
        router.get('/', [OrderController, 'index'])
        router.put('/:id', [OrderController, 'update'])
      }).prefix('/orders')

  }).prefix('v1')
}).prefix('api')

// Swagger routes
router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
})

router.get('/docs', async () => {
  return AutoSwagger.default.ui('/swagger', swagger)
})
