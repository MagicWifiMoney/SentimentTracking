
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking current research data...');
    
    // Check current research queries
    const queriesCount = await prisma.researchQuery.count();
    const resultsCount = await prisma.researchResult.count();
    
    console.log(`Current research queries: ${queriesCount}`);
    console.log(`Current research results: ${resultsCount}`);
    
    if (queriesCount > 0 || resultsCount > 0) {
      console.log('Clearing all research data...');
      
      // Delete all research results first (due to foreign key constraints)
      await prisma.researchResult.deleteMany({});
      console.log('Cleared research results');
      
      // Then delete research queries
      await prisma.researchQuery.deleteMany({});
      console.log('Cleared research queries');
      
      console.log('✅ All research sample data has been cleared');
    } else {
      console.log('✅ No research data found - database is clean');
    }
    
  } catch (error) {
    console.error('Error clearing research data:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
