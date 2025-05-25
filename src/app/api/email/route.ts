// src/app/api/email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {sendTaskAssignmentEmail} from '@/lib/email';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipients, subject, message, taskId } = body;

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

    // Send emails to all recipients
    const emailPromises = users.map(user => 
      sendTaskAssignmentEmail(user.email, subject, message)
    );

    await Promise.all(emailPromises);

    // Create notifications for each recipient
    if (taskId) {
      const notificationPromises = users.map(user =>
        prisma.notification.create({
          data: {
            userId: user.id,
            type: 'EMAIL',
            title: subject,
            message: message.substring(0, 200) + (message.length > 200 ? '...' : ''),
            taskId
          }
        })
      );

      await Promise.all(notificationPromises);
    }

    return NextResponse.json({ 
      message: `Email sent successfully to ${users.length} recipients`,
      sentTo: users.map(u => ({ id: u.id, email: u.email, name: u.name }))
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}