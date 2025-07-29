// Placeholder for prismadb compatibility
// This is used by legacy chat API that uses Clerk auth
// Consider migrating to Drizzle ORM for consistency

export default {
  message: {
    create: () => { throw new Error('Prisma not configured'); },
    findMany: () => { throw new Error('Prisma not configured'); },
  }
};