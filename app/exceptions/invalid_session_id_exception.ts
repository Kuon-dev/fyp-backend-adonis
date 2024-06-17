import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidSessionIdException extends Exception {
  static status = 500
  static code = 'E_INVALID_SESSION_ID'
  static message = 'Invalid session ID'
}
