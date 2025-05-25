'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import TaskCard from '@/components/TaskCard';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import EditTaskModal from '@/components/EditTaskModal';
import { useTasks } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUser';
import { Task, TaskStatus, TaskPriority, User } from '@/lib/types';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter,
  Calendar,
  Users,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

type SortField = 'dueDate' | 'createdAt' | 'title' | 'priority' | 'status';
type SortDirection = 'asc' | 'desc';

export default function AdminTasksPage() {
  const { tasks, isLoading: loading, updateTask, deleteTask, refetch } = useTasks();
  const { users } = useUsers();
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Get unique assignees for filter
  const assignees = Array.from(
    new Set(tasks.filter(task => task.assignedTo).map(task => task.assignedTo!.id))
  ).map(id => tasks.find(task => task.assignedTo?.id === id)?.assignedTo).filter(Boolean);

  // Helper function to normalize status values for comparison
  const normalizeStatus = (status: string): string => {
    return status.toLowerCase();
  };

  // Helper function to normalize priority values for comparison
  const normalizePriority = (priority: string): string => {
    return priority.toLowerCase();
  };

  // Helper function to check if task is overdue
  const isTaskOverdue = (task: Task): boolean => {
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    return dueDate < now && normalizeStatus(task.status) !== 'completed';
  };

  // Helper function to get priority order value
  const getPriorityOrder = (priority: string): number => {
    const normalized = normalizePriority(priority);
    switch (normalized) {
      case 'urgent':
        return 4;
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 0;
    }
  };

  useEffect(() => {
    let filtered = [...tasks];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower) ||
        task.location?.toLowerCase().includes(searchLower) ||
        task.assignedTo?.name.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        filtered = filtered.filter(task => isTaskOverdue(task));
      } else {
        filtered = filtered.filter(task => 
          normalizeStatus(task.status) === normalizeStatus(statusFilter)
        );
      }
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => 
        normalizePriority(task.priority) === normalizePriority(priorityFilter)
      );
    }

    // Apply assignee filter
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned') {
        filtered = filtered.filter(task => !task.assignedTo);
      } else {
        filtered = filtered.filter(task => task.assignedTo?.id === assigneeFilter);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'dueDate':
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'priority':
          aValue = getPriorityOrder(a.priority);
          bValue = getPriorityOrder(b.priority);
          break;
        case 'status':
          aValue = normalizeStatus(a.status);
          bValue = normalizeStatus(b.status);
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredTasks(filtered);
  }, [tasks, searchTerm, statusFilter, priorityFilter, assigneeFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssigneeFilter('all');
    setSortField('dueDate');
    setSortDirection('asc');
  };

  // Modal handlers
  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setShowDetailsModal(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete task');
      }

      await refetch(); // Refresh the tasks list
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const handleUpdateTaskSimple = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update task');
      }

      // Refresh all tasks
      await refetch();
      
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const closeModals = async () => {
    setShowDetailsModal(false);
    setShowEditModal(false);
    setSelectedTask(null);
    
    // Refresh tasks when closing modals
    await refetch();
  };

  // Calculate task stats
  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => normalizeStatus(t.status) === 'pending').length,
    inProgress: tasks.filter(t => normalizeStatus(t.status) === 'in_progress').length,
    completed: tasks.filter(t => normalizeStatus(t.status) === 'completed').length,
    overdue: tasks.filter(t => isTaskOverdue(t)).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Tasks</h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor all tasks ({filteredTasks.length} of {tasks.length})
          </p>
        </div>
        <Link href="/admin/tasks/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tasks by title, description, location, or assignee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {(statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all') && (
                <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                  {[statusFilter, priorityFilter, assigneeFilter].filter(f => f !== 'all').length}
                </span>
              )}
            </Button>
            {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all') && (
              <Button variant="outline" onClick={clearFilters}>
                Clear All
              </Button>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
                placeholder="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </Select>

              <Select
                value={priorityFilter}
                onValueChange={setPriorityFilter}
                placeholder="Filter by priority"
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>

              <Select
                value={assigneeFilter}
                onValueChange={setAssigneeFilter}
                placeholder="Filter by assignee"
              >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {assignees.map((assignee) => (
                  <option key={assignee!.id} value={assignee!.id}>
                    {assignee!.name}
                  </option>
                ))}
              </Select>

              <Select
                value={`${sortField}-${sortDirection}`}
                onValueChange={(value) => {
                  const [field, direction] = value.split('-');
                  setSortField(field as SortField);
                  setSortDirection(direction as SortDirection);
                }}
                placeholder="Sort by"
              >
                <option value="dueDate-asc">Due Date (Earliest)</option>
                <option value="dueDate-desc">Due Date (Latest)</option>
                <option value="createdAt-desc">Created (Newest)</option>
                <option value="createdAt-asc">Created (Oldest)</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
                <option value="priority-desc">Priority (High-Low)</option>
                <option value="priority-asc">Priority (Low-High)</option>
                <option value="status-asc">Status (A-Z)</option>
                <option value="status-desc">Status (Z-A)</option>
              </Select>
            </div>
          )}
        </div>
      </Card>

      {/* Task Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{taskStats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{taskStats.pending}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">{taskStats.inProgress}</div>
          <div className="text-sm text-gray-600">In Progress</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{taskStats.overdue}</div>
          <div className="text-sm text-gray-600">Overdue</div>
        </Card>
      </div>

      {/* Tasks Grid */}
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <div key={task.id} className="relative group">
              <TaskCard
                task={task}
                onUpdate={updateTask}
                onDelete={handleDeleteTask}
                showAssignee={true}
                actions={['edit', 'delete', 'assign']}
              />
              
              {/* Admin Action Overlay */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1 bg-white rounded-lg shadow-lg p-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleViewTask(task)}
                    className="h-8 w-8 p-0"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditTask(task)}
                    className="h-8 w-8 p-0"
                    title="Edit Task"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteTask(task.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete Task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-600 mb-6">
            {tasks.length === 0 
              ? "Get started by creating your first task."
              : "Try adjusting your search or filter criteria."
            }
          </p>
          {tasks.length === 0 && (
            <Link href="/admin/tasks/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Task
              </Button>
            </Link>
          )}
        </Card>
      )}

      {/* Modals */}
      <TaskDetailsModal
        isOpen={showDetailsModal}
        onClose={closeModals}
        task={selectedTask}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
        isAdmin={true}
      />

      <EditTaskModal
        isOpen={showEditModal}
        onClose={closeModals}
        task={selectedTask}
        onSave={handleUpdateTaskSimple}
        users={users}
      />
    </div>
  );
}