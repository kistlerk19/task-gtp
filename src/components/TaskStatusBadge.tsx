// components/TaskStatusBadge.tsx
import React from 'react';
import Badge from './ui/Badge';
import { TaskStatus } from '@/lib/types';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md' | 'lg';
}

const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusConfig = (status: TaskStatus) => {
    switch (status) {
      case 'PENDING':
        return {
          variant: 'warning' as const,
          label: 'Pending',
          icon: '⏳'
        };
      case 'IN_PROGRESS':
        return {
          variant: 'info' as const,
          label: 'In Progress',
          icon: '🔄'
        };
      case 'COMPLETED':
        return {
          variant: 'success' as const,
          label: 'Completed',
          icon: '✅'
        };
      case 'CANCELLED':
        return {
          variant: 'danger' as const,
          label: 'Cancelled',
          icon: '❌'
        };
      default:
        return {
          variant: 'default' as const,
          label: 'Unknown',
          icon: '❓'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant} size={size}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  );
};

export default TaskStatusBadge;