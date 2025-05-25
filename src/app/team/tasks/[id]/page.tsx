'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTasks } from '@/hooks/useTasks';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
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
import { use } from 'react';

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { tasks, isLoading: loading, updateTask, getTask, refreshTasks } = useTasks();
  
  const [task, setTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Unwrap params using React.use
  const { id } = use(params);

  // Status options for the select component
  const statusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' }
  ];

  useEffect(() => {
    const foundTask = tasks.find(t => t.id === id);
    if (foundTask) {
      setTask(foundTask);
      setNewStatus(foundTask.status);
    } else if (!loading) {
      // Only fetch if not already loading and task not found in cache
      if (typeof getTask !== 'function') {
        console.error('getTask is not a function:', getTask);
        setError('Failed to load task. Please try again later.');
        return;
      }

      getTask(id).then((fetchedTask) => {
        if (fetchedTask) {
          setTask(fetchedTask);
          setNewStatus(fetchedTask.status);
        } else {
          setError('Task not found.');
        }
      }).catch((err) => {
        console.error('Error fetching task:', err);
        setError('Failed to load task. Please try again later.');
      });
    }
  }, [tasks, id, getTask, loading]);

  const handleStatusUpdate = async (status: string) => {
    if (!task) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Call the API directly to ensure we get the updated task
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task status');
      }

      const updatedTask = await response.json();
      
      // Update local state immediately
      setTask(updatedTask);
      setNewStatus(updatedTask.status);
      setShowStatusModal(false);
      
      // Refresh the tasks cache to keep everything in sync
      refreshTasks();
      
    } catch (error) {
      console.error('Failed to update task status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update task status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          comments: [
            ...(task.comments || []),
            {
              id: Date.now().toString(),
              content: newComment.trim(),
              author: session?.user?.name || 'Current User',
              createdAt: new Date().toISOString(),
            },
          ]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add comment');
      }

      const updatedTask = await response.json();
      
      // Update local state immediately
      setTask(updatedTask);
      setNewComment('');
      
      // Refresh the tasks cache
      refreshTasks();
      
    } catch (error) {
      console.error('Error adding comment:', error);
      setError(error instanceof Error ? error.message : 'Failed to add comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOwner = task?.assignedTo?.id === session?.user?.id;
  const isOverdue = task && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </Card>
      </div>
    );
  }

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
                      task.priority === 'HIGH' ? 'destructive' :
                      task.priority === 'MEDIUM' ? 'secondary' : 'outline'
                    }
                    className="mt-1"
                  >
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1).toLowerCase()}
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
          <div className="space-y-3">
            {task.status !== 'COMPLETED' && (
              <Button
                onClick={() => handleStatusUpdate('COMPLETED')}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Complete
              </Button>
            )}
            
            {task.status === 'PENDING' && (
              <Button
                onClick={() => handleStatusUpdate('IN_PROGRESS')}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
              >
                Start Working
              </Button>
            )}
          </div>
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
              onChange={(value) => setNewStatus(value)}
              options={statusOptions}
              placeholder="Select status"
            />
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
              disabled={isSubmitting || newStatus === task.status || !newStatus}
            >
              {isSubmitting ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}