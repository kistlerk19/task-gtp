'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTasks } from '@/hooks/useTasks';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import TaskStatusBadge from '@/components/TaskStatusBadge';
import DeadlineWarning from '@/components/DeadlineWarning';
import { Task, TaskStatus } from '@/lib/types';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Clock, 
  Flag, 
  MessageSquare,
  Save,
  Edit3,
  CheckCircle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface TaskDetailPageProps {
  params: {
    id: string;
  };
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { tasks, loading, updateTask, fetchTasks } = useTasks();
  
  const [task, setTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<TaskStatus>('pending');

  useEffect(() => {
    const foundTask = tasks.find(t => t.id === params.id);
    if (foundTask) {
      setTask(foundTask);
      setNewStatus(foundTask.status);
    }
  }, [tasks, params.id]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStatusUpdate = async (status: TaskStatus) => {
    if (!task) return;
    
    setIsSubmitting(true);
    try {
      await updateTask(task.id, { status });
      setTask({ ...task, status });
      setShowStatusModal(false);
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;
    
    setIsSubmitting(true);
    try {
      const updatedTask = {
        ...task,
        comments: [
          ...task.comments,
          {
            id: Date.now().toString(),
            content: newComment.trim(),
            author: session?.user?.name || 'Unknown',
            createdAt: new Date().toISOString(),
          }
        ]
      };
      
      await updateTask(task.id, { comments: updatedTask.comments });
      setTask(updatedTask);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOwner = task?.assignedTo?.id === session?.user?.id;
  const isOverdue = task && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Task not found</h3>
          <p className="text-gray-600 mb-4">The task you're looking for doesn't exist.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </Card>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">You don't have permission to view this task.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h1>
            <div className="flex items-center gap-4">
              <TaskStatusBadge status={task.status} />
              <DeadlineWarning dueDate={task.dueDate} status={task.status} />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setShowStatusModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Update Status
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Description */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          </Card>

          {/* Comments Section */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Comments ({task.comments?.length || 0})
            </h2>
            
            {/* Add Comment */}
            <div className="mb-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmitting}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {task.comments?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No comments yet</p>
              ) : (
                task.comments?.map((comment) => (
                  <div key={comment.id} className="border-l-4 border-blue-200 pl-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{comment.author}</span>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-gray-700">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Task Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Details</h3>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Assigned to</p>
                  <p className="font-medium">{task.assignedTo?.name}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Flag className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Priority</p>
                  <Badge 
                    variant={
                      task.priority === 'high' ? 'destructive' :
                      task.priority === 'medium' ? 'secondary' : 'outline'
                    }
                    className="mt-1"
                  >
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                    {format(new Date(task.dueDate), 'PPP')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium">
                    {format(new Date(task.createdAt), 'PPP')}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="space-y-3">
              {task.status !== 'completed' && (
                <Button
                  onClick={() => handleStatusUpdate('completed')}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Complete
                </Button>
              )}
              
              {task.status === 'pending' && (
                <Button
                  onClick={() => handleStatusUpdate('in_progress')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  Start Working
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Status Update Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Task Status"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select new status:
            </label>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowStatusModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleStatusUpdate(newStatus)}
              disabled={isSubmitting || newStatus === task.status}
            >
              {isSubmitting ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}