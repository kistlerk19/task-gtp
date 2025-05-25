import React from 'react';
import Badge from './ui/Badge';

interface DeadlineWarningProps {
  dueDate: string | Date; // Allow string or Date
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  size?: 'sm' | 'md' | 'lg';
}

const DeadlineWarning: React.FC<DeadlineWarningProps> = ({ 
  dueDate, 
  status, 
  size = 'sm' 
}) => {
  // Don't show warning for completed or cancelled tasks
  if (status === 'COMPLETED' || status === 'CANCELLED') {
    return null;
  }

  // Convert dueDate to Date object if it's a string
  const dueDateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;

  // Check if dueDateObj is a valid Date
  if (!(dueDateObj instanceof Date) || isNaN(dueDateObj.getTime())) {
    console.warn('Invalid dueDate provided:', dueDate);
    return null; // Return null if dueDate is invalid
  }

  const now = new Date();
  const timeUntilDeadline = dueDateObj.getTime() - now.getTime();
  const hoursUntilDeadline = timeUntilDeadline / (1000 * 60 * 60);
  const daysUntilDeadline = timeUntilDeadline / (1000 * 60 * 60 * 24);

  // Don't show warning if dueDate is more than 7 days away
  if (daysUntilDeadline > 7) {
    return null;
  }

  let variant: 'warning' | 'danger' = 'warning';
  let message = '';
  let icon = '⚠️';

  if (timeUntilDeadline < 0) {
    // Overdue
    variant = 'danger';
    icon = '🚨';
    const daysOverdue = Math.abs(Math.floor(daysUntilDeadline));
    message = daysOverdue === 0 
      ? 'Overdue today'
      : `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`;
  } else if (hoursUntilDeadline < 24) {
    // Due today
    variant = 'danger';
    icon = '🔥';
    if (hoursUntilDeadline < 1) {
      message = 'Due in less than 1 hour';
    } else {
      const hours = Math.floor(hoursUntilDeadline);
      message = `Due in ${hours} hour${hours > 1 ? 's' : ''}`;
    }
  } else if (daysUntilDeadline < 3) {
    // Due within 3 days
    variant = 'warning';
    icon = '⏰';
    const days = Math.floor(daysUntilDeadline);
    message = `Due in ${days} day${days > 1 ? 's' : ''}`;
  } else if (daysUntilDeadline <= 7) {
    // Due within a week
    variant = 'warning';
    icon = '📅';
    const days = Math.floor(daysUntilDeadline);
    message = `Due in ${days} days`;
  }

  if (!message) return null;

  return (
    <Badge variant={variant} size={size}>
      <span className="mr-1">{icon}</span>
      {message}
    </Badge>
  );
};

export default DeadlineWarning;