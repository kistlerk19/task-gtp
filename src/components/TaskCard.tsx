// components/TaskCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Task, User } from '@/lib/types';
import Card from './ui/Card';
import TaskStatusBadge from './TaskStatusBadge';
import DeadlineWarning from './DeadlineWarning';
import Badge from './ui/Badge';

interface TaskCardProps {
  task: Task & {
    assignedTo?: User;
    assignedBy?: User;
    dueDate: string
  };
  currentUserRole?: 'ADMIN' | 'TEAM_MEMBER';
  showAssignee?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  currentUserRole = 'TEAM_MEMBER',
  showAssignee = true 
}) => {
  const dueDate = new Date(task.dueDate);
  const createdAt = new Date(task.createdAt);
  const updatedAt = new Date(task.updatedAt);


  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'danger';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getTaskLink = () => {
    if (currentUserRole === 'ADMIN') {
      return `/admin/tasks/${task.id}`;
    }
    return `/team/tasks/${task.id}`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <Link 
              href={getTaskLink()}
              className="block hover:text-blue-600 transition-colors"
            >
              <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
                {task.title}
              </h3>
            </Link>
            <div className="flex items-center space-x-2 mb-2">
              <TaskStatusBadge status={task.status} size="sm" />
              <Badge 
                variant={getPriorityColor(task.priority) as any}
                size="sm"
              >
                {task.priority}
              </Badge>
            </div>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Assignee */}
        {showAssignee && task.assignedTo && (
          <div className="flex items-center mb-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-medium text-white mr-2">
              {task.assignedTo.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-gray-600">
              Assigned to {task.assignedTo.name}
            </span>
          </div>
        )}

        {/* Deadline and warnings */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500">
            <span className="font-medium">Due:</span> {formatDate(dueDate)}
          </div>
          <DeadlineWarning 
            dueDate={dueDate} 
            status={task.status}
            size="sm"
          />
        </div>

        {/* Progress bar for non-completed tasks */}
        {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{task.status === 'IN_PROGRESS' ? '50%' : '0%'}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  task.status === 'IN_PROGRESS' 
                    ? 'bg-blue-500 w-1/2' 
                    : 'bg-gray-300 w-0'
                }`}
              ></div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
          <span>Created {formatDate(createdAt)}</span>
          {updatedAt.getTime() !== createdAt.getTime() && (
            <span>Updated {formatDate(updatedAt)}</span>
          )}
        </div>

        {/* Action buttons for different roles */}
        <div className="flex space-x-2 mt-4">
          <Link 
            href={getTaskLink()}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-center"
          >
            View Details
          </Link>
          
          {currentUserRole === 'TEAM_MEMBER' && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
            <button className="bg-green-600 text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
              Update Status
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TaskCard;