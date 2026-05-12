import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

if (!globalForPrisma.prisma) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
    max: 1,
    min: 0,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 60000,
    allowExitOnIdle: true,
  })

  pool.on('error', (err) => {
    console.error('[PG Pool] error:', err.message)
  })

  const adapter = new PrismaPg(pool)
  globalForPrisma.prisma = new PrismaClient({ adapter })
}

export default globalForPrisma.prisma
