import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidImageException extends Exception {
  static status = 400
  static code = 'E_INVALID_IMAGE'
  static message = 'Invalid image format'
}
