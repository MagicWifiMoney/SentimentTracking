import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const brandId = parseInt(params.brandId);
    if (isNaN(brandId)) {
      return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 });
    }

    // Verify brand ownership
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        userId: user.id,
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Get keywords for this brand
    const keywords = await prisma.brandKeyword.findMany({
      where: { brandId },
      orderBy: [
        { isActive: 'desc' },
        { addedAt: 'desc' },
      ],
    });

    return NextResponse.json({ keywords });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    return NextResponse.json(
      { error: 'Failed to fetch keywords' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const brandId = parseInt(params.brandId);
    if (isNaN(brandId)) {
      return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 });
    }

    const body = await req.json();
    const { keyword, type = 'track', category } = body;

    if (!keyword || typeof keyword !== 'string') {
      return NextResponse.json({ error: 'Invalid keyword' }, { status: 400 });
    }

    if (type !== 'track' && type !== 'exclude') {
      return NextResponse.json({ error: 'Invalid type. Must be "track" or "exclude"' }, { status: 400 });
    }

    // Verify brand ownership
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        userId: user.id,
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Create the keyword
    const newKeyword = await prisma.brandKeyword.create({
      data: {
        brandId,
        keyword: keyword.trim().toLowerCase(),
        type,
        category: category || null,
      },
    });

    return NextResponse.json({ keyword: newKeyword }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating keyword:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This keyword already exists for this brand' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create keyword' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const brandId = parseInt(params.brandId);
    if (isNaN(brandId)) {
      return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 });
    }

    const body = await req.json();
    const { keywordId, isActive, category } = body;

    if (!keywordId || typeof keywordId !== 'number') {
      return NextResponse.json({ error: 'Invalid keyword ID' }, { status: 400 });
    }

    // Verify brand ownership
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        userId: user.id,
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Update the keyword
    const updatedKeyword = await prisma.brandKeyword.update({
      where: { 
        id: keywordId,
        brandId: brandId, // Ensure keyword belongs to this brand
      },
      data: {
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(category !== undefined && { category }),
      },
    });

    return NextResponse.json({ keyword: updatedKeyword });
  } catch (error) {
    console.error('Error updating keyword:', error);
    return NextResponse.json(
      { error: 'Failed to update keyword' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const brandId = parseInt(params.brandId);
    if (isNaN(brandId)) {
      return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const keywordId = parseInt(searchParams.get('keywordId') || '');

    if (isNaN(keywordId)) {
      return NextResponse.json({ error: 'Invalid keyword ID' }, { status: 400 });
    }

    // Verify brand ownership
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        userId: user.id,
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Delete the keyword
    await prisma.brandKeyword.delete({
      where: { 
        id: keywordId,
        brandId: brandId, // Ensure keyword belongs to this brand
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting keyword:', error);
    return NextResponse.json(
      { error: 'Failed to delete keyword' },
      { status: 500 }
    );
  }
}
