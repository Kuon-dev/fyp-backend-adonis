import { Exception } from '@adonisjs/core/exceptions'

export default class NotFoundException extends Exception {
  static status = 401
  static code = 'E_NOT_FOUND'
  static message = 'Not found'
}


