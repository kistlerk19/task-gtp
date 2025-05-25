// lib/email.ts
import nodemailer from 'nodemailer';
import { TaskAssignmentEmail, TaskUpdateEmail, DeadlineReminderEmail } from './types';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendTaskAssignmentEmail = async (data: TaskAssignmentEmail) => {
  const { taskTitle, taskDescription, assigneeName, assigneeEmail, dueDate, priority, adminName } = data;

  const subject = `New Task Assigned: ${taskTitle}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">New Task Assigned</h1>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <p style="font-size: 16px; color: #333;">Hi ${assigneeName},</p>
        
        <p style="font-size: 16px; color: #333;">
          You have been assigned a new task by ${adminName}.
        </p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h2 style="color: #333; margin-top: 0;">${taskTitle}</h2>
          ${taskDescription ? `<p style="color: #666; margin: 10px 0;">${taskDescription}</p>` : ''}
          
          <div style="margin: 15px 0;">
            <span style="display: inline-block; background: ${getPriorityColor(priority)}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
              ${priority} PRIORITY
            </span>
          </div>
          
          ${dueDate ? `<p style="color: #666;"><strong>Due Date:</strong> ${dueDate}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/team/tasks" 
             style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Task
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Please log in to your dashboard to view full task details and update progress.
        </p>
      </div>
      
      <div style="background: #e9ecef; padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
        <p>This is an automated message from the Task Management System.</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: assigneeEmail,
    subject,
    html,
  });
};

export const sendTaskUpdateEmail = async (data: TaskUpdateEmail) => {
  const { taskTitle, newStatus, assigneeName, notes, completedAt } = data;

  const subject = `Task Updated: ${taskTitle}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Task Status Updated</h1>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <p style="font-size: 16px; color: #333;">Hi ${assigneeName},</p>
        
        <p style="font-size: 16px; color: #333;">
          Your task status has been updated.
        </p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h2 style="color: #333; margin-top: 0;">${taskTitle}</h2>
          
          <div style="margin: 15px 0;">
            <span style="display: inline-block; background: ${getStatusColor(newStatus)}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">
              ${newStatus.replace('_', ' ')}
            </span>
          </div>
          
          ${completedAt ? `<p style="color: #666;"><strong>Completed:</strong> ${completedAt}</p>` : ''}
          ${notes ? `<p style="color: #666;"><strong>Notes:</strong> ${notes}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/team/tasks" 
             style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Task Details
          </a>
        </div>
      </div>
      
      <div style="background: #e9ecef; padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
        <p>This is an automated message from the Task Management System.</p>
      </div>
    </div>
  `;

  // Note: This function currently logs instead of sending. Update if needed.
  console.log('Task update email would be sent:', { subject, html });
};

export const sendDeadlineReminderEmail = async (data: DeadlineReminderEmail) => {
  const { taskTitle, dueDate, assigneeName, daysUntilDue } = data;

  const subject = `Reminder: Task "${taskTitle}" due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} days`}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Task Deadline Reminder</h1>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <p style="font-size: 16px; color: #333;">Hi ${assigneeName},</p>
        
        <p style="font-size: 16px; color: #333;">
          This is a reminder that your task is ${daysUntilDue === 0 ? 'due today' : `due in ${daysUntilDue} days`}.
        </p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h2 style="color: #333; margin-top: 0;">${taskTitle}</h2>
          <p style="color: #666;"><strong>Due Date:</strong> ${dueDate}</p>
          
          ${daysUntilDue === 0 ? 
            '<div style="background: #dc3545; color: white; padding: 10px; border-radius: 4px; margin: 10px 0;"><strong>⚠️ Due Today!</strong></div>' :
            `<div style="background: #ffc107; color: #212529; padding: 10px; border-radius: 4px; margin: 10px 0;"><strong>📅 ${daysUntilDue} days remaining</strong></div>`
          }
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/team/tasks" 
             style="background: #ffc107; color: #212529; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Update Task Status
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Please update your task progress to keep the team informed.
        </p>
      </div>
      
      <div style="background: #e9ecef; padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
        <p>This is an automated message from the Task Management System.</p>
      </div>
    </div>
  `;

  // Note: This function currently logs instead of sending. Update if needed.
  console.log('Deadline reminder email would be sent:', { subject, html });
};

// Helper functions for email styling
const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'URGENT': return '#dc3545';
    case 'HIGH': return '#fd7e14';
    case 'MEDIUM': return '#ffc107';
    case 'LOW': return '#28a745';
    default: return '#6c757d';
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'COMPLETED': return '#28a745';
    case 'IN_PROGRESS': return '#007bff';
    case 'PENDING': return '#ffc107';
    case 'OVERDUE': return '#dc3545';
    default: return '#6c757d';
  }
};

export const testEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email connection failed:', error);
    return false;
  }
};