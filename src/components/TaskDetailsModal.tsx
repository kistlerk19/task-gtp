// components/TaskDetailsModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { 
  Calendar, 
  User, 
  Clock, 
  Flag, 
  Edit, 
  Trash2, 
  X,
  CheckCircle,
  AlertCircle,
  PlayCircle
} from 'lucide-react';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  isAdmin: boolean;
}

const statusConfig = {
  [TaskStatus.PENDING]: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    label: 'Pending'
  },
  [TaskStatus.IN_PROGRESS]: {
    color: 'bg-blue-100 text-blue-800',
    icon: PlayCircle,
    label: 'In Progress'
  },
  [TaskStatus.COMPLETED]: {
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    label: 'Completed'
  }
};

const priorityConfig = {
  [TaskPriority.LOW]: {
    color: 'bg-gray-100 text-gray-800',
    label: 'Low'
  },
  [TaskPriority.MEDIUM]: {
    color: 'bg-blue-100 text-blue-800',
    label: 'Medium'
  },
  [TaskPriority.HIGH]: {
    color: 'bg-red-100 text-red-800',
    label: 'High'
  }
};

export default function TaskDetailsModal({
  isOpen,
  onClose,
  task,
  onEdit,
  onDelete,
  isAdmin
}: TaskDetailsModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!task) return null;

  const statusInfo = statusConfig[task.status];
  const priorityInfo = priorityConfig[task.priority];
  const StatusIcon = statusInfo.icon;
  
  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETED;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Task Details" size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {task.title}
              </h2>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={statusInfo.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
                <Badge className={priorityInfo.color}>
                  <Flag className="h-3 w-3 mr-1" />
                  {priorityInfo.label}
                </Badge>
                {isOverdue && (
                  <Badge className="bg-red-100 text-red-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(task)}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
              <p className="text-gray-900 whitespace-pre-wrap">
                {task.description || 'No description provided'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Due Date</h3>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className={`${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                  {new Date(task.dueDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Assigned To</h3>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">
                  {task.assignedTo?.name || 'Unassigned'}
                </span>
                {task.assignedTo?.email && (
                  <span className="text-sm text-gray-500">
                    ({task.assignedTo.email})
                  </span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Created By</h3>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">
                  {task.createdBy?.name || 'Unknown'}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Created Date</h3>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">
                  {new Date(task.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section (if you have comments) */}
        {task.comments && task.comments.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">
              Comments ({task.comments.length})
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {task.comments.map((comment: any) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {comment.user.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}