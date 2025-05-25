'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import TaskForm from '@/components/TaskForm';
import { useAuth } from '@/hooks/useAuth';
import { Task, User } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Save, Users } from 'lucide-react';

export default function CreateTaskPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const response = await fetch('/api/users', { cache: 'no-store' });
        if (response.ok) {
          const users = await response.json();
          console.log('Fetched users:', users);
          setTeamMembers(users.filter((u: User) => u.role === 'TEAM_MEMBER'));
        } else {
          console.error('Failed to fetch users:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
      }
    };

    fetchTeamMembers();
  }, []);

  const handleSubmit = async (taskData: Partial<Task>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...taskData,
          createdById: user?.id,
        }),
      });

      if (response.ok) {
        const newTask = await response.json();
        if (taskData.assignedToId) {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: taskData.assignedToId,
              type: 'TASK_ASSIGNED',
              title: 'New Task Assigned',
              message: `You have been assigned a new task: "${taskData.title}"`,
              taskId: newTask.id,
            }),
          });

          await fetch('/api/email', {
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
          });
        }
        router.push('/admin/tasks');
      } else {
        const error = await response.text();
        alert('Error creating task: ' + error);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Error creating task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log('Team members in render:', teamMembers);

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

      {teamMembers.length > 0 ? (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Available Team Members</h3>
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
          <p className="text-sm text-yellow-700">No team members available to assign tasks.</p>
        </Card>
      )}

      <Card className="p-8">
        <TaskForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          users={teamMembers} // Changed from teamMembers to users
          submitButtonText="Create Task"
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