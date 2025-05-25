// src/app/api/tasks/[id]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
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
      where: { taskId: params.id },
      include: {
        author: {
          select: { id: true, name: true, email: true }
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
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
    if (session.user.role !== 'ADMIN' && 
        task.assignedToId !== session.user.id && 
        task.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        taskId: params.id,
        authorId: session.user.id
      },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Create notification for task assignee if commenter is not the assignee
    if (task.assignedToId && task.assignedToId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: task.assignedToId,
          type: 'TASK_UPDATE',
          title: 'New Comment',
          message: `${session.user.name} commented on task "${task.title}"`,
          taskId: task.id
        }
      });
    }

    // Create notification for task creator if commenter is not the creator
    if (task.createdById !== session.user.id && task.createdById !== task.assignedToId) {
      await prisma.notification.create({
        data: {
          userId: task.createdById,
          type: 'TASK_UPDATE',
          title: 'New Comment',
          message: `${session.user.name} commented on task "${task.title}"`,
          taskId: task.id
        }
      });
    }

    // Transform to match frontend format
    const transformedComment = {
      id: comment.id,
      content: comment.content,
      author: comment.author.name,
      createdAt: comment.createdAt.toISOString()
    };

    return NextResponse.json(transformedComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}