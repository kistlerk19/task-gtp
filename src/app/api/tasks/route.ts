// app/api/tasks/route.ts
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


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    console.log('Received body:', body);
    const { title, description, priority, status, dueDate, assignedToId } = body;

    // Detailed validation
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!description) missingFields.push('description');
    if (!dueDate) missingFields.push('dueDate');
    if (!assignedToId) missingFields.push('assignedToId');

    if (missingFields.length > 0) {
      console.log('Missing fields:', missingFields);
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const dueDateValue = new Date(dueDate);
    if (dueDateValue <= new Date()) {
      return NextResponse.json(
        { error: 'Due date must be in the future' },
        { status: 400 }
      );
    }

    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId },
    });

    if (!assignedUser) {
      return NextResponse.json(
        { error: 'Assigned user not found' },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        status: status || 'PENDING',
        dueDate: dueDateValue,
        assignedToId,
        createdById: session.user.id,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Create notification (this should now work with the updated schema)
    await prisma.notification.create({
      data: {
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: "${title}"`,
        userId: assignedToId,
        taskId: task.id,
      },
    });

    try {
      await sendTaskAssignmentEmail({
        taskTitle: title,
        taskDescription: description,
        assigneeName: assignedUser.name,
        assigneeEmail: assignedUser.email,
        dueDate: dueDateValue.toLocaleDateString(),
        priority: priority || 'abes',
        adminName: session.user.name,
      });
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', {
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