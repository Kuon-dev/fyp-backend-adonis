/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),

  /*
  |----------------------------------------------------------
  | Variables for configuring the mail package
  |----------------------------------------------------------
  */
  SMTP_HOST: Env.schema.string(),
  SMTP_PORT: Env.schema.string(),
  SMTP_USER: Env.schema.string(),
  SMTP_PASS: Env.schema.string(),

  OPENAI_API_KEY: Env.schema.string(),

  FRONTEND_URL: Env.schema.string(),

  DATABASE_URL: Env.schema.string(),
  DATABASE_LOCAL_HOST: Env.schema.string(),
  DATABASE_LOCAL_DB: Env.schema.string(),
  DATABASE_LOCAL_USER: Env.schema.string(),
  DATABASE_LOCAL_PASSWORD: Env.schema.string(),
  DATABASE_LOCAL_PORT: Env.schema.number(),

  LEMON_SQUEEZY_API_KEY: Env.schema.string(),

  STRIPE_SECRET_KEY: Env.schema.string(),
  STRIPE_PUBLIC_KEY: Env.schema.string(),
  // STRIPE_WEBHOOK_SECRET: Env.schema.string(),

  OpenAI_API_KEY: Env.schema.string(),

  AWS_REGION: Env.schema.string(),
  AWS_ACCESS_KEY_ID: Env.schema.string(),
  AWS_SECRET_ACCESS_KEY: Env.schema.string(),
  AWS_S3_BUCKET_NAME: Env.schema.string(),
  AWS_SESSION_TOKEN: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the limiter package
  |----------------------------------------------------------
  */
  LIMITER_STORE: Env.schema.enum(['database', 'memory'] as const)

})
