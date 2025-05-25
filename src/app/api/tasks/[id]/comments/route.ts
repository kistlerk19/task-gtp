// src/app/api/tasks/[id]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params before accessing properties
    const { id: taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { 
        id: true, 
        assignedToId: true,
        createdById: true
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if user has permission to view this task
    if (session.user.role !== 'ADMIN' && 
        task.assignedToId !== session.user.id && 
        task.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const comments = await prisma.comment.findMany({
      where: { taskId: taskId },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Transform to match frontend format
    const transformedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      author: comment.author.name,
      createdAt: comment.createdAt.toISOString()
    }));

    return NextResponse.json(transformedComments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params before accessing properties
    const { id: taskId } = await params;

    const body = await request.json();
    const { content } = body;
    
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({ 
      where: { id: taskId },
      select: {
        id: true,
        assignedToId: true,
        createdById: true,
        title: true
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if user has permission to comment on this task
    const canComment = session.user.role === 'ADMIN' || 
                      task.assignedToId === session.user.id ||
                      task.createdById === session.user.id;
    
    if (!canComment) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        taskId: taskId,
        authorId: session.user.id,
      },
      include: { 
        author: { 
          select: { id: true, name: true, email: true, role: true } 
        } 
      },
    });

    // Create notifications for relevant users (wrapped in try-catch to prevent failures)
    try {
      const notificationsToCreate = [];

      // Notify task assignee (if different from comment author)
      if (task.assignedToId && task.assignedToId !== session.user.id) {
        notificationsToCreate.push({
          type: 'COMMENT_ADDED',
          title: 'New Comment',
          message: `${session.user.name} added a comment to your task "${task.title}"`,
          userId: task.assignedToId,
          taskId: taskId,
        });
      }

      // Notify task creator (if different from both assignee and comment author)
      if (task.createdById && 
          task.createdById !== session.user.id && 
          task.createdById !== task.assignedToId) {
        notificationsToCreate.push({
          type: 'COMMENT_ADDED',
          title: 'New Comment',
          message: `${session.user.name} added a comment to task "${task.title}"`,
          userId: task.createdById,
          taskId: taskId,
        });
      }

      // Create notifications if any exist
      if (notificationsToCreate.length > 0) {
        await prisma.notification.createMany({
          data: notificationsToCreate,
        });
      }
    } catch (notificationError) {
      console.error('Error creating notifications:', notificationError);
      // Don't fail the whole request for notification errors
    }

    // Return transformed comment to match frontend format
    const transformedComment = {
      id: comment.id,
      content: comment.content,
      author: comment.author.name || 'Unknown User',
      createdAt: comment.createdAt.toISOString(),
    };

    return NextResponse.json(transformedComment, { status: 201 });
    
  } catch (error) {
    console.error('Error creating comment:', error);
    
    // Return a proper JSON error response
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}