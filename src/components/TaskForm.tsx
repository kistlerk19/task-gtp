// components/TaskForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Task, User, TaskStatus, TaskPriority } from '@/lib/types';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Card from './ui/Card';

interface TaskFormProps {
  task?: Task & { assignedTo?: User };
  users?: User[];
  onSubmit: (taskData: TaskFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assignedToId: string;
}

const TaskForm: React.FC<TaskFormProps> = ({
  task,
  users = [],
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create'
}) => {
  const [formData, setFormData] = useState<TaskFormData>({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'MEDIUM',
    status: task?.status || 'PENDING',
    dueDate: task?.dueDate 
    ? new Date(task.dueDate).toISOString().slice(0, 16) 
    : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),    assignedToId: task?.assignedToId || ''
  });

  const [errors, setErrors] = useState<Partial<TaskFormData>>({});

  const handleInputChange = (field: keyof TaskFormData, value: string) => {
    // Ensure value is always a string and not a DOM element
    const stringValue = typeof value === 'string' ? value : String(value);
    
    setFormData(prev => ({ ...prev, [field]: stringValue }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Simple handler for select elements - now receives only string values
  const handleSelectChange = (field: keyof TaskFormData, value: string) => {
    handleInputChange(field, value);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<TaskFormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Deadline is required';
    } else {
      const dueDateDate = new Date(formData.dueDate);
      const now = new Date();
      if (dueDateDate <= now) {
        newErrors.dueDate = 'Deadline must be in the future';
      }
    }

    if (!formData.assignedToId && mode === 'create') {
      newErrors.assignedToId = 'Please select a team member';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Create a clean copy of form data with only primitive values
      const cleanFormData: TaskFormData = {
        title: String(formData.title).trim(),
        description: String(formData.description).trim(),
        priority: formData.priority as TaskPriority,
        status: formData.status as TaskStatus,
        dueDate: String(formData.dueDate),
        assignedToId: String(formData.assignedToId || '')
      };
      
      console.log('Submitting clean form data:', cleanFormData);
      onSubmit(cleanFormData);
    }
  };

  const priorityOptions = [
    { value: 'LOW', label: '🟢 Low Priority' },
    { value: 'MEDIUM', label: '🟡 Medium Priority' },
    { value: 'HIGH', label: '🔴 High Priority' }
  ];

  const statusOptions = [
    { value: 'PENDING', label: '⏳ Pending' },
    { value: 'IN_PROGRESS', label: '🔄 In Progress' },
    { value: 'COMPLETED', label: '✅ Completed' },
    { value: 'CANCELLED', label: '❌ Cancelled' }
  ];

  const userOptions = users.map(user => ({
    value: user.id,
    label: `${user.name} (${user.email})`
  }));

  return (
    <Card>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Create New Task' : 'Edit Task'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {mode === 'create' 
              ? 'Fill in the details to create a new task for your team'
              : 'Update the task details below'
            }
          </p>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Task Title *
          </label>
          <Input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter task title..."
            error={errors.title}
            disabled={isLoading}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe the task in detail..."
            disabled={isLoading}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.description ? 'border-red-500' : ''
            } ${isLoading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description}</p>
          )}
        </div>

        {/* Priority and Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
              Priority *
            </label>
            <Select
              id="priority"
              value={formData.priority}
              onChange={(value) => handleSelectChange('priority', value)}
              options={priorityOptions}
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status *
            </label>
            <Select
              id="status"
              value={formData.status}
              onChange={(value) => handleSelectChange('status', value)}
              options={statusOptions}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
            Deadline *
          </label>
          <Input
            id="dueDate"
            type="datetime-local"
            value={formData.dueDate}
            onChange={(e) => handleInputChange('dueDate', e.target.value)}
            error={errors.dueDate}
            disabled={isLoading}
          />
        </div>

        {/* Assigned To (only for create mode or admin) */}
        {(mode === 'create' || users.length > 0) && (
          <div>
            <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-2">
              Assign To {mode === 'create' ? '*' : ''}
            </label>
            <Select
              id="assignedTo"
              value={formData.assignedToId}
              onChange={(value) => handleSelectChange('assignedToId', value)}
              options={[
                { value: '', label: 'Select team member...' },
                ...userOptions
              ]}
              error={errors.assignedToId}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            loading={isLoading}
          >
            {mode === 'create' ? 'Create Task' : 'Update Task'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default TaskForm;