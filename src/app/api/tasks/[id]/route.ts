// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTaskAssignmentEmail } from '@/lib/email';
// Import Prisma enum types directly
import type { TaskStatus as PrismaTaskStatus, TaskPriority as PrismaTaskPriority } from '@prisma/client';

// Helper function to convert frontend status to Prisma enum
function convertStatusToPrismaEnum(status: string): PrismaTaskStatus {
  const statusMap: Record<string, PrismaTaskStatus> = {
    'pending': 'PENDING',
    'in_progress': 'IN_PROGRESS', 
    'completed': 'COMPLETED',
    'overdue': 'OVERDUE'
  };
  
  return statusMap[status.toLowerCase()] || status.toUpperCase() as PrismaTaskStatus;
}

// Helper function to convert frontend priority to Prisma enum
function convertPriorityToPrismaEnum(priority: string): PrismaTaskPriority {
  const priorityMap: Record<string, PrismaTaskPriority> = {
    'low': 'LOW',
    'medium': 'MEDIUM',
    'high': 'HIGH',
    'urgent': 'URGENT'
  };
  
  return priorityMap[priority.toLowerCase()] || priority.toUpperCase() as PrismaTaskPriority;
}

// Helper function to convert Prisma enum to frontend format
function convertStatusToFrontend(status: PrismaTaskStatus): string {
  const statusMap: Record<PrismaTaskStatus, string> = {
    'PENDING': 'pending',
    'IN_PROGRESS': 'in_progress',
    'COMPLETED': 'completed',
    'OVERDUE': 'overdue'
  };
  
  return statusMap[status] || status.toLowerCase();
}

// Helper function to convert Prisma priority to frontend format
function convertPriorityToFrontend(priority: PrismaTaskPriority): string {
  const priorityMap: Record<PrismaTaskPriority, string> = {
    'LOW': 'low',
    'MEDIUM': 'medium',
    'HIGH': 'high',
    'URGENT': 'urgent'
  };
  
  return priorityMap[priority] || priority.toLowerCase();
}

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
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if user has permission to view this task
    if (session.user.role !== 'ADMIN' && task.assignedToId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Convert the task data to match frontend expectations
    const transformedTask = {
      ...task,
      status: convertStatusToFrontend(task.status),
      priority: convertPriorityToFrontend(task.priority),
      dueDate: task.dueDate?.toISOString() || null,
      completedAt: task.completedAt?.toISOString() || null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      comments: task.comments?.map(comment => ({
        id: comment.id,
        content: comment.content,
        author: comment.author.name,
        createdAt: comment.createdAt.toISOString()
      })) || []
    };

    return NextResponse.json(transformedTask);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, status, priority, dueDate, assignedToId, notes } = body;

    const existingTask = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } }
      }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check permissions
    const canEdit = session.user.role === 'ADMIN' || 
                   existingTask.assignedToId === session.user.id;
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Team members can only update status and add notes
    const updateData: any = {};
    
    if (session.user.role === 'ADMIN') {
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (priority) updateData.priority = convertPriorityToPrismaEnum(priority);
      if (dueDate) updateData.dueDate = new Date(dueDate);
      if (assignedToId) updateData.assignedToId = assignedToId;
    }
    
    if (status) {
      updateData.status = convertStatusToPrismaEnum(status);
      
      // Set completedAt if status is completed
      if (status.toLowerCase() === 'completed' || status === 'COMPLETED') {
        updateData.completedAt = new Date();
      } else if (existingTask.completedAt) {
        // Clear completedAt if status is changed from completed to something else
        updateData.completedAt = null;
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Send notification if status changed
    if (status && convertStatusToPrismaEnum(status) !== existingTask.status) {
      const recipient = session.user.role === 'ADMIN' 
        ? existingTask.assignedTo 
        : updatedTask.createdBy;

      if (recipient?.email) {
        await sendTaskAssignmentEmail(
          recipient.email,
          'Task Status Updated',
          `Task "${updatedTask.title}" status has been updated to ${status}.`
        );
      }

      // Create notification
      if (recipient?.id) {
        await prisma.notification.create({
          data: {
            userId: recipient.id,
            type: 'TASK_UPDATE',
            title: 'Task Status Updated',
            message: `Task "${updatedTask.title}" status changed to ${status}`,
            taskId: updatedTask.id
          }
        });
      }
    }

    // Transform the response to match frontend expectations
    const transformedTask = {
      ...updatedTask,
      status: convertStatusToFrontend(updatedTask.status),
      priority: convertPriorityToFrontend(updatedTask.priority),
      dueDate: updatedTask.dueDate?.toISOString() || null,
      completedAt: updatedTask.completedAt?.toISOString() || null,
      createdAt: updatedTask.createdAt.toISOString(),
      updatedAt: updatedTask.updatedAt.toISOString(),
      comments: updatedTask.comments?.map(comment => ({
        id: comment.id,
        content: comment.content,
        author: comment.author.name,
        createdAt: comment.createdAt.toISOString()
      })) || []
    };

    return NextResponse.json(transformedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.task.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}