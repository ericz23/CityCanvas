import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Common database operations
export const db = {
  // Event queries
  events: {
    findMany: prisma.event.findMany,
    findUnique: prisma.event.findUnique,
    create: prisma.event.create,
    update: prisma.event.update,
    upsert: prisma.event.upsert,
    delete: prisma.event.delete,
  },
  
  // Source queries
  sources: {
    findMany: prisma.source.findMany,
    findUnique: prisma.source.findUnique,
    create: prisma.source.create,
    update: prisma.source.update,
    upsert: prisma.source.upsert,
  },
  
  // Raw queries for complex operations
  $queryRaw: prisma.$queryRaw,
  $executeRaw: prisma.$executeRaw,
  
  // Transactions
  $transaction: prisma.$transaction,
} 