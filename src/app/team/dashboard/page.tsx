'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import TaskCard from '@/components/TaskCard';
import DeadlineWarning from '@/components/DeadlineWarning';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Task, TaskStatus } from '@/lib/types';
import Link from 'next/link';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Calendar,
  Target,
  TrendingUp,
  Bell
} from 'lucide-react';

export default function TeamDashboard() {
  const { user } = useAuth();
  const { tasks, loading, updateTask } = useTasks();
  const { notifications, unreadCount } = useNotifications();
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  });
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Task[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (tasks.length > 0 && user) {
      // Filter tasks assigned to current user
      const userTasks = tasks.filter(task => task.assignedToId === user.id);
      setMyTasks(userTasks);

      // Calculate stats
      const now = new Date();
      const taskStats = userTasks.reduce(
        (acc, task) => {
          acc.total++;
          
          // Check if task is overdue
          const isOverdue = new Date(task.dueDate) < now && task.status !== TaskStatus.COMPLETED;
          
          if (isOverdue && task.status !== TaskStatus.COMPLETED) {
            acc.overdue++;
          } else {
            switch (task.status) {
              case TaskStatus.PENDING:
                acc.pending++;
                break;
              case TaskStatus.IN_PROGRESS:
                acc.inProgress++;
                break;
              case TaskStatus.COMPLETED:
                acc.completed++;
                break;
            }
          }
          
          return acc;
        },
        { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 }
      );

      setStats(taskStats);

      // Get upcoming deadlines (next 7 days, excluding completed tasks)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      const upcoming = userTasks
        .filter(task => 
          task.status !== TaskStatus.COMPLETED &&
          new Date(task.dueDate) <= sevenDaysFromNow &&
          new Date(task.dueDate) >= now
        )
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5);
      
      setUpcomingDeadlines(upcoming);

      // Get recent tasks (last 5 updated)
      const recent = [...userTasks]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);
      
      setRecentTasks(recent);
    }
  }, [tasks, user]);

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTask(taskId, updates);
      
      // Send notification to admin if status changed
      if (updates.status) {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: tasks.find(t => t.id === taskId)?.createdById,
            type: 'TASK_UPDATED',
            title: 'Task Status Updated',
            message: `Task "${tasks.find(t => t.id === taskId)?.title}" status changed to ${updates.status?.replace('_', ' ')}`,
            taskId,
          }),
        });
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.name}. Here's your task overview.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {unreadCount > 0 && (
            <div className="relative">
              <Bell className="h-6 w-6 text-gray-600" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount}
              </span>
            </div>
          )}
          <Link href="/team/tasks">
            <Button>View All Tasks</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">My Tasks</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Deadline Warnings */}
      {stats.overdue > 0 && (
        <DeadlineWarning
          tasks={myTasks.filter(task => {
            const now = new Date();
            return new Date(task.dueDate) < now && task.status !== TaskStatus.COMPLETED;
          })}
        />
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Deadlines */}
        <div>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Upcoming Deadlines</h2>
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            
            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-4">
                {upcomingDeadlines.map((task) => {
                  const daysUntilDue = Math.ceil(
                    (new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  
                  return (
                    <div key={task.id} className="border-l-4 border-orange-500 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
                          </p>
                          <Badge className={`mt-2 ${
                            task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                            task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No upcoming deadlines</p>
              </div>
            )}
          </Card>
        </div>

        {/* Recent Tasks */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Tasks</h2>
              <Link href="/team/tasks">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
            
            {recentTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdate={handleTaskUpdate}
                    showAssignee={false}
                    actions={['status']}
                    compact={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No tasks assigned yet</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Today's Focus */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Today's Focus</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {myTasks.filter(task => {
                const today = new Date().toDateString();
                return new Date(task.dueDate).toDateString() === today;
              }).length}
            </div>
            <p className="text-gray-600">Tasks due today</p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {myTasks.filter(task => 
                task.status === TaskStatus.COMPLETED &&
                new Date(task.updatedAt).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-gray-600">Completed today</p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {myTasks.filter(task => task.status === TaskStatus.IN_PROGRESS).length}
            </div>
            <p className="text-gray-600">Currently working on</p>
          </div>
        </div>
      </Card>
    </div>
  );
}