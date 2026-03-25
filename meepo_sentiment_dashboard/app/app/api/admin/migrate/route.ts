import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization');
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Add intent_type and intent_score columns if they don't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE sentiment_data ADD COLUMN IF NOT EXISTS intent_type TEXT;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE sentiment_data ADD COLUMN IF NOT EXISTS intent_score DOUBLE PRECISION;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS sentiment_data_intent_type_idx ON sentiment_data(intent_type);
    `);

    return NextResponse.json({ success: true, message: 'Migration applied' });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
