'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import TaskCard from '@/components/TaskCard';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { Task, TaskStatus } from '@/lib/types';
import Link from 'next/link';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Users, 
  Calendar,
  Plus,
  TrendingUp
} from 'lucide-react';

const statusColors = {
  [TaskStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [TaskStatus.OVERDUE]: 'bg-red-100 text-red-800',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { tasks, loading } = useTasks();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (tasks.length > 0) {
      const now = new Date();
      const taskStats = tasks.reduce(
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
      
      // Get recent tasks (last 5)
      const sortedTasks = [...tasks]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      
      setRecentTasks(sortedTasks);
    }
  }, [tasks]);

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.name}. Here's what's happening today.
          </p>
        </div>
        <Link href="/admin/tasks/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
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
              <Users className="h-6 w-6 text-blue-600" />
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

      {/* Recent Tasks and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tasks */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Tasks</h2>
              <Link href="/admin/tasks">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
            
            {recentTasks.length > 0 ? (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge className={statusColors[task.status as TaskStatus]}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            Assigned to: {task.assignedTo?.name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No tasks found</p>
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="space-y-4">
              <Link href="/admin/tasks/create" className="block">
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Task
                </Button>
              </Link>
              
              <Link href="/admin/tasks" className="block">
                <Button className="w-full justify-start" variant="outline">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View All Tasks
                </Button>
              </Link>
              
              <Link href="/admin/tasks?status=overdue" className="block">
                <Button className="w-full justify-start" variant="outline">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  View Overdue Tasks
                </Button>
              </Link>
              
              <Link href="/admin/tasks?status=pending" className="block">
                <Button className="w-full justify-start" variant="outline">
                  <Clock className="h-4 w-4 mr-2" />
                  Review Pending Tasks
                </Button>
              </Link>
            </div>
          </Card>
          
          {/* Today's Summary */}
          <Card className="p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tasks due today</span>
                <Badge variant="outline">
                  {tasks.filter(task => 
                    new Date(task.dueDate).toDateString() === new Date().toDateString()
                  ).length}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed today</span>
                <Badge className="bg-green-100 text-green-800">
                  {tasks.filter(task => 
                    task.status === TaskStatus.COMPLETED &&
                    new Date(task.updatedAt).toDateString() === new Date().toDateString()
                  ).length}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active team members</span>
                <Badge variant="outline">
                  {new Set(tasks.filter(task => task.assignedTo).map(task => task.assignedTo?.id)).size}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}