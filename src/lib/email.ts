import nodemailer from 'nodemailer';
import { TaskAssignmentEmail, TaskUpdateEmail, DeadlineReminderEmail } from './types';

const transporter = nodemailer.createTransport({
  host: process.env.AWS_SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.AWS_SMTP_USERNAME,
    pass: process.env.AWS_SMTP_PASSWORD,
  },
});

export const sendTaskAssignmentEmail = async (data: TaskAssignmentEmail) => {
  const { taskTitle, taskDescription, assigneeName, assigneeEmail, dueDate, priority, adminName } = data;

  if (!assigneeEmail) {
    throw new Error('Assignee email is required');
  }

  const subject = `New Task Assignment: ${taskTitle}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: linear-gradient(135deg, #005670 0%, #0083a3 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">New Task Assignment</h1>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <p style="font-size: 16px; margin: 0 0 20px;">Dear ${assigneeName},</p>
        
        <p style="font-size: 16px; line-height: 1.5;">
          You have been assigned a new task by ${adminName} in the Task Management System. Please find the details below:
        </p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #005670;">
          <h2 style="color: #333; margin-top: 0; font-size: 20px;">${taskTitle}</h2>
          ${taskDescription ? `<p style="color: #666; line-height: 1.5; margin: 10px 0;">${taskDescription}</p>` : ''}
          
          <div style="margin: 15px 0;">
            <span style="display: inline-block; background: ${getPriorityColor(priority)}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
              ${priority} Priority
            </span>
          </div>
          
          ${dueDate ? `<p style="color: #666; font-size: 14px;"><strong>Due Date:</strong> ${dueDate}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/team/tasks" 
             style="background: #005670; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
            View Task Details
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.5;">
          Please access your dashboard to review the task and update its progress. If you have any questions, contact ${adminName} or your project manager.
        </p>
        
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          Best regards,<br>
          Task Management System
        </p>
      </div>
      
      <div style="background: #e9ecef; padding: 15px; text-align: center; color: #6c757d; font-size: 12px;">
        <p style="margin: 0;">This is an automated notification from the Task Management System.</p>
      </div>
    </div>
  `;

  console.log(`Sending assignment email to: ${assigneeEmail}`);
  
  const result = await transporter.sendMail({
    from: process.env.AWS_EMAIL_USER,
    to: assigneeEmail,
    subject,
    html,
  });

  console.log('Email sent successfully:', result.messageId);
  return result;
};

export const sendTaskUpdateEmail = async (data: TaskUpdateEmail) => {
  const { taskTitle, newStatus, assigneeName, assigneeEmail, notes, completedAt } = data;

  if (!assigneeEmail) {
    throw new Error('Assignee email is required');
  }

  const subject = `Task Status Update: ${taskTitle}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: linear-gradient(135deg, #005670 0%, #0083a3 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Task Status Update</h1>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <p style="font-size: 16px; margin: 0 0 20px;">Dear ${assigneeName},</p>
        
        <p style="font-size: 16px; line-height: 1.5;">
          The status of your task, "${taskTitle}", has been updated in the Task Management System. Please review the details below:
        </p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #005670;">
          <h2 style="color: #333; margin-top: 0; font-size: 20px;">${taskTitle}</h2>
          
          <div style="margin: 15px 0;">
            <span style="display: inline-block; background: ${getStatusColor(newStatus)}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
              ${newStatus.replace('_', ' ')}
            </span>
          </div>
          
          ${completedAt ? `<p style="color: #666; font-size: 14px;"><strong>Completed On:</strong> ${completedAt}</p>` : ''}
          ${notes ? `<p style="color: #666; font-size: 14px; line-height: 1.5;"><strong>Notes:</strong> ${notes}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/team/tasks" 
             style="background: #005670; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
            View Task Details
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.5;">
          Please log in to your dashboard to review the updated task details. If you have any questions or require further clarification, contact your project manager.
        </p>
        
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          Best regards,<br>
          Task Management System
        </p>
      </div>
      
      <div style="background: #e9ecef; padding: 15px; text-align: center; color: #6c757d; font-size: 12px;">
        <p style="margin: 0;">This is an automated notification from the Task Management System.</p>
      </div>
    </div>
  `;

  console.log(`Sending update email to: ${assigneeEmail}`);

  const result = await transporter.sendMail({
    from: process.env.AWS_EMAIL_USER,
    to: assigneeEmail,
    subject,
    html,
  });

  console.log('Update email sent successfully:', result.messageId);
  return result;
};

export const sendDeadlineReminderEmail = async (data: DeadlineReminderEmail) => {
  const { taskTitle, dueDate, assigneeName, assigneeEmail, daysUntilDue } = data;

  if (!assigneeEmail) {
    throw new Error('Assignee email is required');
  }

  const subject = `Task Deadline Reminder: ${taskTitle} Due ${daysUntilDue === 0 ? 'Today' : `in ${daysUntilDue} Days`}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: linear-gradient(135deg, #005670 0%, #0083a3 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Task Deadline Reminder</h1>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <p style="font-size: 16px; margin: 0 0 20px;">Dear ${assigneeName},</p>
        
        <p style="font-size: 16px; line-height: 1.5;">
          This is a reminder that your task, "${taskTitle}", is due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} days`}. Please ensure timely completion or update the task status as needed.
        </p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #005670;">
          <h2 style="color: #333; margin-top: 0; font-size: 20px;">${taskTitle}</h2>
          <p style="color: #666; font-size: 14px;"><strong>Due Date:</strong> ${dueDate}</p>
          
          ${daysUntilDue === 0 ? 
            '<div style="background: #dc3545; color: white; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 14px;"><strong>⚠️ Due Today!</strong></div>' :
            `<div style="background: #ffc107; color: #212529; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 14px;"><strong>📅 ${daysUntilDue} Days Remaining</strong></div>`
          }
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/team/tasks" 
             style="background: #005670; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
            Update Task Status
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.5;">
          Please log in to your dashboard to update the task status or contact your project manager if you need assistance.
        </p>
        
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          Best regards,<br>
          Task Management System
        </p>
      </div>
      
      <div style="background: #e9ecef; padding: 15px; text-align: center; color: #6c757d; font-size: 12px;">
        <p style="margin: 0;">This is an automated notification from the Task Management System.</p>
      </div>
    </div>
  `;

  console.log(`Sending reminder email to: ${assigneeEmail}`);

  const result = await transporter.sendMail({
    from: process.env.AWS_EMAIL_USER,
    to: assigneeEmail,
    subject,
    html,
  });

  console.log('Reminder email sent successfully:', result.messageId);
  return result;
};

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
    console.log('Email connection verified successfully');
    return true;
  } catch (error) {
    console.error('Email connection failed:', error);
    return false;
  }
};