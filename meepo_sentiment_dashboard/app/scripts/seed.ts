
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting database seed...');
    
    // Upsert a demo user for testing (password: demo123)
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@example.com' },
      update: {
        password: '$2a$12$R0onZBviziZgf7KXFSAR5.OfN20G954J/QGLdxiJ5rNvSf39sQbAi',
      },
      create: {
        name: 'Demo User',
        email: 'demo@example.com',
        password: '$2a$12$R0onZBviziZgf7KXFSAR5.OfN20G954J/QGLdxiJ5rNvSf39sQbAi',
      },
    });
    console.log('Upserted demo user (demo@example.com / demo123)');
    
    console.log('\n=== Seeding Complete ===');
    console.log('Database initialized successfully!');
    console.log('Demo account: demo@example.com / demo123');
    console.log('Users can also sign up and create their own brands through the onboarding flow.');
    
  } catch (error) {
    console.error('Error seeding data:', error);
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
