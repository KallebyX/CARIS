// Placeholder for prisma compatibility  
// This is used by legacy session API that uses Clerk auth
// Consider migrating to Drizzle ORM for consistency

export default {
  session: {
    createMany: () => { throw new Error('Prisma not configured'); },
    findMany: () => { throw new Error('Prisma not configured'); },
  }
};