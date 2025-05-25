// src/app/api/email/route.ts - Fixed version
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sendTaskAssignmentEmail, sendTaskUpdateEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipients, subject, message, taskId, emailType = 'assignment' } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Recipients array is required' },
        { status: 400 }
      );
    }

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400 }
      );
    }

    // Get user emails
    const users = await prisma.user.findMany({
      where: {
        id: { in: recipients }
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No valid recipients found' },
        { status: 400 }
      );
    }

    // Get task details if taskId is provided
    let taskDetails = null;
    if (taskId) {
      taskDetails = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          title: true,
          description: true,
          priority: true,
          status: true,
          dueDate: true,
        }
      });
    }

    // Send emails to all recipients
    const emailPromises = users.map(async user => {
      try {
        if (emailType === 'update' && taskDetails) {
          // Send task update email
          await sendTaskUpdateEmail({
            taskTitle: taskDetails.title,
            newStatus: taskDetails.status,
            assigneeName: user.name || 'User',
            assigneeEmail: user.email,
            notes: message,
            completedAt: taskDetails.status === 'COMPLETED' ? new Date().toLocaleString() : undefined,
          });
        } else {
          // Send task assignment email (default)
          await sendTaskAssignmentEmail({
            taskTitle: taskDetails?.title || subject,
            taskDescription: taskDetails?.description || message,
            assigneeName: user.name || 'User',
            assigneeEmail: user.email,
            dueDate: taskDetails?.dueDate?.toLocaleDateString() || null,
            priority: taskDetails?.priority || 'MEDIUM',
            adminName: session.user.name || 'Admin',
          });
        }
        
        return { success: true, user };
      } catch (error: any) {
        console.error(`Email failed for ${user.email}:`, error.message);
        return { success: false, user, error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const failed = results.filter(r => !r.success);
    const successful = results.filter(r => r.success);

    // Create notifications for each recipient
    if (taskId) {
      const notificationPromises = successful.map(r =>
        prisma.notification.create({
          data: {
            userId: r.user.id,
            type: emailType === 'update' ? 'TASK_UPDATED' : 'EMAIL',
            title: subject,
            message: message.substring(0, 200) + (message.length > 200 ? '...' : ''),
            taskId
          }
        })
      );
      
      try {
        await Promise.all(notificationPromises);
      } catch (notificationError) {
        console.error('Error creating notifications:', notificationError);
        // Don't fail the request for notification errors
      }
    }

    return NextResponse.json({
      message: `Emails attempted for ${users.length} users`,
      sent: successful.map(r => r.user),
      failed: failed.map(r => ({ ...r.user, error: r.error })),
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ 
      error: 'Failed to send email', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}