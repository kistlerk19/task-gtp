// app/api/tasks/[id]/route.ts - Fixed version with email sending
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTaskAssignmentEmail, sendTaskUpdateEmail } from '@/lib/email';
import { TaskStatus, TaskPriority } from '@/lib/types';

// GET single task by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check permissions
    if (session.user.role === 'TEAM_MEMBER' && task.assignedToId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: taskId } = await params;
    const body = await request.json();
    const { title, description, priority, status, dueDate, assignedToId } = body;

    console.log('Updating task:', taskId, 'with data:', body);

    // Validate task exists
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    console.log('Existing task found:', existingTask.id);

    // Check permissions
    const isAdmin = session.user.role === 'ADMIN';
    const isAssignedUser = existingTask.assignedToId === session.user.id;

    console.log('Permission check:', { isAdmin, isAssignedUser, userRole: session.user.role });

    if (!isAdmin && !isAssignedUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If user is not admin, they can only update status
    if (!isAdmin && isAssignedUser) {
      // Validate that only status is being updated
      const allowedFields = ['status'];
      const providedFields = Object.keys(body);
      const hasUnallowedFields = providedFields.some(field => !allowedFields.includes(field));
      
      if (hasUnallowedFields) {
        return NextResponse.json({ 
          error: 'Team members can only update task status' 
        }, { status: 403 });
      }

      if (!status) {
        return NextResponse.json({ 
          error: 'Status is required for task update' 
        }, { status: 400 });
      }
    }

    // Validate input
    const validStatuses: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    const validPriorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }

    // Build update data based on user role
    const updateData: any = {};
    
    if (isAdmin) {
      // Admin can update all fields
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (priority !== undefined) updateData.priority = priority;
      if (status !== undefined) updateData.status = status;
      if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
      if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    } else if (isAssignedUser) {
      // Assigned user can only update status
      if (status !== undefined) updateData.status = status;
    }

    console.log('Update data:', updateData);

    // Update the task
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

    console.log('Task updated successfully:', updatedTask.id);

    // Handle notifications and emails for status updates
    if (status && status !== existingTask.status) {
      try {
        const updaterName = session.user.name || 'User';
        const isStatusUpdateByAssignee = isAssignedUser && !isAdmin;
        
        // Send email notification for status updates
        if (isStatusUpdateByAssignee && updatedTask.createdBy?.email) {
          // Assignee updated status - notify admin/creator
          try {
            await sendTaskUpdateEmail({
              taskTitle: updatedTask.title,
              newStatus: status,
              assigneeName: updatedTask.createdBy.name || 'Admin',
              assigneeEmail: updatedTask.createdBy.email,
              notes: `Status updated by ${updaterName}`,
              completedAt: status === 'COMPLETED' ? new Date().toLocaleString() : undefined,
            });
            console.log('Status update email sent to admin:', updatedTask.createdBy.email);
          } catch (emailError) {
            console.error('Failed to send status update email to admin:', emailError);
          }

          // Create notification for admin
          await prisma.notification.create({
            data: {
              type: 'TASK_UPDATED',
              title: 'Task Status Updated',
              message: `${updaterName} updated status of task "${updatedTask.title}" to ${status}`,
              userId: updatedTask.createdById!,
              taskId: updatedTask.id,
            },
          });
        } else if (isAdmin && updatedTask.assignedTo?.email) {
          // Admin updated status - notify assignee
          try {
            await sendTaskUpdateEmail({
              taskTitle: updatedTask.title,
              newStatus: status,
              assigneeName: updatedTask.assignedTo.name || 'Team Member',
              assigneeEmail: updatedTask.assignedTo.email,
              notes: `Status updated by ${updaterName}`,
              completedAt: status === 'COMPLETED' ? new Date().toLocaleString() : undefined,
            });
            console.log('Status update email sent to assignee:', updatedTask.assignedTo.email);
          } catch (emailError) {
            console.error('Failed to send status update email to assignee:', emailError);
          }

          // Create notification for assignee
          await prisma.notification.create({
            data: {
              type: 'TASK_UPDATED',
              title: 'Task Status Updated',
              message: `Task "${updatedTask.title}" status changed to ${status}`,
              userId: updatedTask.assignedToId!,
              taskId: updatedTask.id,
            },
          });
        }
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the whole request for notification errors
      }
    }

    // Handle email for task assignment changes (when admin assigns task to new user)
    if (isAdmin && assignedToId && assignedToId !== existingTask.assignedToId) {
      try {
        const newAssignee = await prisma.user.findUnique({
          where: { id: assignedToId },
          select: { name: true, email: true },
        });

        if (newAssignee?.email) {
          await sendTaskAssignmentEmail({
            taskTitle: updatedTask.title,
            taskDescription: updatedTask.description || '',
            assigneeName: newAssignee.name || 'Team Member',
            assigneeEmail: newAssignee.email,
            dueDate: updatedTask.dueDate?.toLocaleDateString() || null,
            priority: updatedTask.priority,
            adminName: session.user.name || 'Admin',
          });
          console.log('Task assignment email sent to new assignee:', newAssignee.email);
        }
      } catch (emailError) {
        console.error('Failed to send task assignment email:', emailError);
      }
    }

    // Return the updated task
    const responseData = {
      ...updatedTask,
      comments: [], // Frontend will load comments separately
    };

    console.log('Sending response:', responseData.id);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE task
export async function DELETE(
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

    // Check if task exists
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

    // Delete related records first (due to foreign key constraints)
    await prisma.notification.deleteMany({
      where: { taskId: taskId },
    });

    // Delete comments - only if the Comment model exists
    try {
      await prisma.comment.deleteMany({
        where: { taskId: taskId },
      });
    } catch (commentDeleteError) {
      console.log('Comment model may not exist, skipping comment deletion');
    }

    // Delete the task
    await prisma.task.delete({
      where: { id: taskId },
    });

    // Create notification for assignee if task was assigned
    if (existingTask.assignedToId) {
      try {
        await prisma.notification.create({
          data: {
            type: 'TASK_DELETED',
            title: 'Task Deleted',
            message: `Task "${existingTask.title}" has been deleted`,
            userId: existingTask.assignedToId,
          },
        });
      } catch (notificationError) {
        console.error('Error creating deletion notification:', notificationError);
      }
    }

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}