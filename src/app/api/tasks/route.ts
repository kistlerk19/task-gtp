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

    console.log('Prisma where clause:', where); // Log for debugging

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        createdBy: { // Changed from assignedBy to createdBy
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.log('Raw error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error ? String(error) : 'Unknown error' },
      { status: 500 }
    );
  }
}

// export async function GET(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);

//     if (!session || !session.user || !session.user.id || !session.user.role) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { searchParams } = new URL(request.url);
//     const userId = searchParams.get('userId');
//     const status = searchParams.get('status') as TaskStatus;
//     const priority = searchParams.get('priority') as TaskPriority;
//     const assignedToId = searchParams.get('assignedToId');

//     // Validate status and priority
//     const validStatuses: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED']; // Adjust as needed
//     const validPriorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH']; // Adjust as needed
//     if (status && !validStatuses.includes(status)) {
//       return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
//     }
//     if (priority && !validPriorities.includes(priority)) {
//       return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
//     }

//     // Build filter conditions
//     const where: any = {};
//     if (session.user.role === 'TEAM_MEMBER') {
//       where.assignedToId = session.user.id;
//     } else if (session.user.role === 'ADMIN' && assignedToId) {
//       where.assignedToId = assignedToId;
//     }
//     if (status) where.status = status;
//     if (priority) where.priority = priority;
//     if (userId) where.assignedToId = userId;

//     console.log('Prisma where clause:', where); // Log for debugging

//     const tasks = await prisma.task.findMany({
//       where,
//       include: {
//         assignedTo: {
//           select: { id: true, name: true, email: true, role: true },
//         },
//         assignedBy: {
//           select: { id: true, name: true, email: true, role: true },
//         },
//       },
//       orderBy: [{ createdAt: 'desc' }],
//     });

//     return NextResponse.json(tasks);
//   } catch (error) {
//     console.log('Raw error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
//     console.error('Error fetching tasks:', error || 'Unknown error');
//     return NextResponse.json(
//       { error: 'Internal server error', details: error ? String(error) : 'Unknown error' },
//       { status: 500 }
//     );
//   }
// }

// export async function GET(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);

//     if (!session || !session.user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { searchParams } = new URL(request.url);
//     const userId = searchParams.get('userId');
//     const status = searchParams.get('status') as TaskStatus;
//     const priority = searchParams.get('priority') as TaskPriority;
//     const assignedToId = searchParams.get('assignedToId');

//     // Build filter conditions
//     const where: any = {};

//     // Role-based filtering
//     if (session.user.role === 'TEAM_MEMBER') {
//       // Team members can only see tasks assigned to them
//       where.assignedToId = session.user.id;
//     } else if (session.user.role === 'ADMIN') {
//       // Admins can see all tasks, but can filter by assignedToId
//       if (assignedToId) {
//         where.assignedToId = assignedToId;
//       }
//     }

//     // Additional filters
//     if (status) where.status = status;
//     if (priority) where.priority = priority;
//     if (userId) where.assignedToId = userId;

//     const tasks = await prisma.task.findMany({
//       where,
//       include: {
//         assignedTo: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//             role: true,
//           },
//         },
//         assignedBy: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//             role: true,
//           },
//         },
//       },
//       orderBy: [
//         { createdAt: 'desc' },
//       ],
//     });

//     return NextResponse.json(tasks);
//   } catch (error) {
//     console.log('Raw error:', error); // Log raw error for debugging
//     console.error('Error fetching tasks:', error || 'Unknown error');
//     return NextResponse.json(
//       { error: 'Internal server error', details: error ? String(error) : 'Unknown error' },
//       { status: 500 }
//     );
//   }
// }

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can create tasks
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, priority, status, deadline, assignedToId } = body;

    // Validation
    if (!title || !description || !deadline || !assignedToId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate deadline is in the future
    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      return NextResponse.json(
        { error: 'Deadline must be in the future' },
        { status: 400 }
      );
    }

    // Check if assigned user exists and is a team member
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId },
    });

    if (!assignedUser) {
      return NextResponse.json(
        { error: 'Assigned user not found' },
        { status: 400 }
      );
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        status: status || 'PENDING',
        deadline: deadlineDate,
        assignedToId,
        assignedById: session.user.id,
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
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Create notification for assigned user
    await prisma.notification.create({
      data: {
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: "${title}"`,
        userId: assignedToId,
        taskId: task.id,
      },
    });

    // Send email notification
    try {
      await sendTaskAssignmentEmail({
        taskTitle: title,
        taskDescription: description,
        assigneeName: assignedUser.name,
        assigneeEmail: assignedUser.email,
        dueDate: deadlineDate.toLocaleDateString(),
        priority: priority || 'MEDIUM',
        adminName: session.user.name,
      });
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the task creation if email fails
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.log('Raw error:', error); // Log raw error for debugging
    console.error('Error creating task:', error || 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error', details: error ? String(error) : 'Unknown error' },
      { status: 500 }
    );
  }
}