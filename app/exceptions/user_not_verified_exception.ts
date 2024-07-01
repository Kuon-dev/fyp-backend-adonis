import { Exception } from '@adonisjs/core/exceptions'

export default class UserNotVerifiedException extends Exception {
  static status = 403
  static code = 'E_USER_NOT_VERIFIED'
  static message = 'The user account is not verified'
}
