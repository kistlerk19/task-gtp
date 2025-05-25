// components/DeadlineWarning.tsx
import React from 'react';
import Badge from './ui/Badge';

interface DeadlineWarningProps {
  deadline: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  size?: 'sm' | 'md' | 'lg';
}

const DeadlineWarning: React.FC<DeadlineWarningProps> = ({ 
  deadline, 
  status, 
  size = 'sm' 
}) => {
  // Don't show warning for completed or cancelled tasks
  if (status === 'COMPLETED' || status === 'CANCELLED') {
    return null;
  }

  const now = new Date();
  const timeUntilDeadline = deadline.getTime() - now.getTime();
  const hoursUntilDeadline = timeUntilDeadline / (1000 * 60 * 60);
  const daysUntilDeadline = timeUntilDeadline / (1000 * 60 * 60 * 24);

  // Don't show warning if deadline is more than 7 days away
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