import { Exception } from '@adonisjs/core/exceptions'

export default class MediaNotFoundException extends Exception {
  static status = 404
  static code = 'E_MEDIA_NOT_FOUND'
  static message = 'The requested media file was not found'
}
