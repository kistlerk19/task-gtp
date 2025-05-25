// src/app/api/tasks/debug/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all tasks with basic info for debugging
    const tasks = await prisma.task.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        assignedToId: true,
        createdById: true,
      },
      take: 10, // Limit to first 10 for debugging
    });

    // Get current user info
    const userInfo = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    };

    const debugInfo = {
      session: userInfo,
      totalTasks: tasks.length,
      tasks: tasks,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}