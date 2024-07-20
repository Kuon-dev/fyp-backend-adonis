import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AdminDashboardService from '#services/admin_dashboard_service'
import UserDashboardService from '#services/user_dashboard_service'

@inject()
export default class DashboardController {
  constructor(
    private adminDashboardService: AdminDashboardService,
    private userDashboardService: UserDashboardService
  ) {}

  /**
   * @getAdminDashboardData
   * @description Get admin dashboard data
   * @responseBody 200 - { salesOverview: {...}, userStatistics: {...}, ... }
   * @responseBody 403 - { error: "Unauthorized access" }
   * @responseBody 500 - { error: "Internal server error" }
   */
  public async getAdminDashboardData({ request, response }: HttpContext) {
    try {
      if (request.user?.role !== 'ADMIN') {
        return response.forbidden({ error: 'Unauthorized access' })
      }

      const dashboardData = await this.adminDashboardService.getDashboardData()
      return response.ok(dashboardData)
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error)
      return response.internalServerError({ error: 'Internal server error' })
    }
  }

  /**
   * @getUserDashboardData
   * @description Get user dashboard data
   * @responseBody 200 - { purchaseHistory: {...}, accessedRepos: [...], ... }
   * @responseBody 401 - { error: "Unauthorized" }
   * @responseBody 500 - { error: "Internal server error" }
   */
  public async getUserDashboardData({ request, response }: HttpContext) {
    try {
      if (!request.user) {
        return response.unauthorized({ error: 'Unauthorized' })
      }

      const dashboardData = await this.userDashboardService.getDashboardData(request.user.id)
      return response.ok(dashboardData)
    } catch (error) {
      console.error('Error fetching user dashboard data:', error)
      return response.internalServerError({ error: 'Internal server error' })
    }
  }
}
