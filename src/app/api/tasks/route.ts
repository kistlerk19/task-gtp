
// Fixed app/api/tasks/route.ts - ADD THIS FOR TASK CREATION
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTaskAssignmentEmail } from '@/lib/email';
import { TaskStatus, TaskPriority } from '@/lib/types';


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id || !session.user.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') as TaskStatus;
    const priority = searchParams.get('priority') as TaskPriority;
    const assignedToId = searchParams.get('assignedToId');

    // Validate status and priority
    const validStatuses: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    const validPriorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }

    // Build filter conditions
    const where: any = {};
    if (session.user.role === 'TEAM_MEMBER') {
      where.assignedToId = session.user.id;
    } else if (session.user.role === 'ADMIN' && assignedToId) {
      where.assignedToId = assignedToId;
    }
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (userId) where.assignedToId = userId;

    console.log('Prisma where clause:', where);

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    // Safe error logging
    console.error('Error fetching tasks:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// POST create new task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    console.log('Received body:', body);
    
    const { title, description, priority, status, dueDate, assignedToId } = body;

    // Validate required fields
    if (!title || !assignedToId) {
      return NextResponse.json(
        { error: 'Title and assignedToId are required' },
        { status: 400 }
      );
    }

    // Validate assigned user exists
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true, name: true, email: true }
    });

    if (!assignedUser) {
      return NextResponse.json(
        { error: 'Assigned user not found' },
        { status: 400 }
      );
    }

    // Create the task
    const newTask = await prisma.task.create({
      data: {
        title,
        description: description || '',
        priority: priority || 'MEDIUM',
        status: status || 'PENDING',
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedToId,
        createdById: session.user.id,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned',
        message: `You have been assigned to task: "${newTask.title}"`,
        userId: assignedToId,
        taskId: newTask.id,
      },
    });

    // Send email notification
    try {
      await sendTaskAssignmentEmail({
        taskTitle: newTask.title,
        taskDescription: newTask.description || '',
        assigneeName: assignedUser.name || 'User',
        assigneeEmail: assignedUser.email,
        dueDate: newTask.dueDate ? newTask.dueDate.toLocaleDateString() : null,
        priority: newTask.priority,
        adminName: session.user.name || 'Admin',
      });
      console.log('Email sent successfully to:', assignedUser.email);
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the task creation if email fails
    }

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Fixed app/api/tasks/[id]/route.ts - UPDATE THE PUT METHOD
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: taskId } = await params;
    const body = await request.json();
    const { title, description, priority, status, dueDate, assignedToId } = body;

    // Validate task exists
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Handle notifications and emails for different update types
    if (assignedToId && assignedToId !== existingTask.assignedToId) {
      // Task reassigned
      await prisma.notification.create({
        data: {
          type: 'TASK_UPDATED',
          title: 'Task Reassigned',
          message: `You have been assigned to task: "${updatedTask.title}"`,
          userId: assignedToId,
          taskId: updatedTask.id,
        },
      });

      // Send assignment email to new assignee
      try {
        await sendTaskAssignmentEmail({
          taskTitle: updatedTask.title,
          taskDescription: updatedTask.description || '',
          assigneeName: updatedTask.assignedTo?.name || 'User',
          assigneeEmail: updatedTask.assignedTo?.email || '',
          dueDate: updatedTask.dueDate ? updatedTask.dueDate.toLocaleDateString() : null,
          priority: updatedTask.priority,
          adminName: session.user.name || 'Admin',
        });
      } catch (emailError) {
        console.error('Error sending assignment email:', emailError);
      }
    } else if (status && status !== existingTask.status) {
      // Status updated
      await prisma.notification.create({
        data: {
          type: 'TASK_UPDATED',
          title: 'Task Status Updated',
          message: `Task "${updatedTask.title}" status changed to ${status}`,
          userId: updatedTask.assignedToId,
          taskId: updatedTask.id,
        },
      });

      // Send update email to assignee
      try {
        await sendTaskUpdateEmail({
          taskTitle: updatedTask.title,
          newStatus: status,
          assigneeName: updatedTask.assignedTo?.name || 'User',
          assigneeEmail: updatedTask.assignedTo?.email || '', // FIX: Send to assignee, not admin
          notes: `Task status updated by ${session.user.name}`,
          completedAt: status === 'COMPLETED' ? new Date().toLocaleDateString() : undefined,
        });
      } catch (emailError) {
        console.error('Error sending update email:', emailError);
      }
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}