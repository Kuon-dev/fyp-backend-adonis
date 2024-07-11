import { PrismaClient } from '@prisma/client'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import env from '#start/env'

const { Pool } = pg

const connectionString = `${env.get('DATABASE_URL')}`

const pool = new Pool({ connectionString })

const adapter = new PrismaPg(pool)
export const prisma = new PrismaClient({ adapter })

// export const prisma = new PrismaClient({});
