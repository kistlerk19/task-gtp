'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import TaskForm, { TaskFormData } from '@/components/TaskForm';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';

export default function CreateTaskPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use useCallback to memoize the fetch function
  const fetchTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/users', { 
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const users = await response.json();
        
        // Filter team members and ensure we have valid data
        const validTeamMembers = users.filter((u: User) => 
          u && u.role === 'TEAM_MEMBER' && u.id
        );
        
        setTeamMembers(validTeamMembers);
        console.log('Team members fetched:', validTeamMembers);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch users:', errorText);
        setError(`Failed to fetch users: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      setError('Error fetching team members');
    } finally {
      setLoading(false);
    }
  }, []);

  // Use useEffect with proper dependencies
  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Log team members only when they change, not on every render
  useEffect(() => {
    if (teamMembers.length > 0) {
      console.log('Team members updated:', teamMembers);
    }
  }, [teamMembers]);

  const handleSubmit = async (taskData: TaskFormData) => {
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    try {
      // Convert TaskFormData to API format
      const apiTaskData = {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        status: taskData.status,
        dueDate: taskData.dueDate,
        assignedToId: taskData.assignedToId || null,
        createdById: user?.id,
      };

      console.log('Sending to API:', apiTaskData);

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiTaskData),
      });

      if (response.ok) {
        const newTask = await response.json();
        
        // Handle notifications in parallel
        const promises = [];
        
        if (apiTaskData.assignedToId) {
          // Create notification
          promises.push(
            fetch('/api/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: apiTaskData.assignedToId,
                type: 'TASK_ASSIGNED',
                title: 'New Task Assigned',
                message: `You have been assigned a new task: "${apiTaskData.title}"`,
                taskId: newTask.id,
              }),
            })
          );

          // Send email
          promises.push(
            fetch('/api/email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: newTask.assignedTo?.email || '',
                subject: 'New Task Assignment',
                taskId: newTask.id,
                type: 'TASK_ASSIGNED',
              }),
            })
          );
        }

        // Wait for notifications to complete (but don't block on errors)
        try {
          await Promise.allSettled(promises);
        } catch (notificationError) {
          console.error('Error sending notifications:', notificationError);
          // Continue anyway - task was created successfully
        }

        router.push('/admin/tasks');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert('Error creating task: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Error creating task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/tasks">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Tasks
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Create New Task</h1>
          <p className="text-gray-600 mt-1">
            Create and assign a new task to your team members
          </p>
        </div>
      </div>

      {loading ? (
        <Card className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading team members...</span>
          </div>
        </Card>
      ) : error ? (
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-5 w-5 text-red-600">⚠️</div>
            <h3 className="font-medium text-red-900">Error Loading Team Members</h3>
          </div>
          <p className="text-sm text-red-700 mb-3">{error}</p>
          <Button onClick={fetchTeamMembers} size="sm" variant="outline">
            Retry
          </Button>
        </Card>
      ) : teamMembers.length > 0 ? (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Available Team Members ({teamMembers.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((member) => (
              <span
                key={member.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {member.name || 'Unnamed Member'}
              </span>
            ))}
          </div>
          <p className="text-sm text-blue-700 mt-2">
            You can assign this task to any of the above team members
          </p>
        </Card>
      ) : (
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-5 w-5 text-yellow-600">⚠️</div>
            <h3 className="font-medium text-yellow-900">No Team Members Available</h3>
          </div>
          <p className="text-sm text-yellow-700">
            No team members are available to assign tasks. Make sure you have users with the 'TEAM_MEMBER' role.
          </p>
        </Card>
      )}

      <Card className="p-8">
        <TaskForm
          onSubmit={handleSubmit}
          users={teamMembers}
          isLoading={isSubmitting}
          mode="create"
        />
      </Card>

      <Card className="p-6 bg-gray-50">
        <h3 className="font-medium text-gray-900 mb-3">Task Creation Guidelines</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Provide clear and detailed task descriptions to avoid confusion</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Set realistic deadlines considering task complexity and team member availability</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Assign appropriate priority levels to help team members prioritize their work</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Team members will receive email notifications when tasks are assigned to them</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}