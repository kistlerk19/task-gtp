// hooks/useTasks.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR, { mutate } from 'swr'; // Import useSWR and mutate
import { Task, User, TaskStatus, TaskPriority } from '@/lib/types';
import { TaskFormData } from '@/components/TaskForm';

interface UseTasksOptions {
  userId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToId?: string;
}

interface UseTasksReturn {
  tasks: (Task & { assignedTo?: User; assignedBy?: User })[];
  isLoading: boolean;
  error: string | null;
  createTask: (taskData: TaskFormData) => Promise<Task | null>;
  updateTask: (taskId: string, taskData: Partial<TaskFormData>) => Promise<Task | null>;
  deleteTask: (taskId: string) => Promise<boolean>;
  getTask: (taskId: string) => Promise<(Task & { assignedTo?: User; assignedBy?: User }) | null>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<boolean>;
  refreshTasks: () => void; // Changed to void as SWR handles refresh
}

// Global fetcher function for SWR
const swrFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to fetch data');
  }
  return res.json();
};

export const useTasks = (options: UseTasksOptions = {}): UseTasksReturn => {
  // Build SWR key based on options
  const swrKey = `/api/tasks?${new URLSearchParams(options as Record<string, string>).toString()}`;

  // Use SWR for fetching tasks
  const { data: tasks, error, isLoading } = useSWR<
    (Task & { assignedTo?: User; assignedBy?: User })[]
  >(swrKey, swrFetcher);

  const currentTasks = tasks || []; // Ensure tasks is always an array

  // Memoize the refresh function for explicit revalidation
  const refreshTasks = useCallback(() => {
    mutate(swrKey); // Tell SWR to revalidate the data for this key
  }, [swrKey]);

  const createTask = useCallback(async (taskData: TaskFormData): Promise<Task | null> => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create task');
      }

      const newTask = await response.json();
      mutate(swrKey, (prevTasks: typeof tasks) => [newTask, ...(prevTasks || [])], false); // Update SWR cache without re-fetching immediately
      return newTask;
    } catch (err) {
      console.error('Error creating task:', err);
      // SWR handles setting global error state
      return null;
    }
  }, [swrKey]); // Depend on swrKey for cache mutation

  const updateTask = useCallback(async (taskId: string, taskData: Partial<TaskFormData>): Promise<Task | null> => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task');
      }

      const updatedTask = await response.json();
      mutate(swrKey, (prevTasks: typeof tasks) =>
        (prevTasks || []).map(task =>
          task.id === taskId ? { ...task, ...updatedTask } : task
        ), false); // Update SWR cache
      return updatedTask;
    } catch (err) {
      console.error('Error updating task:', err);
      return null;
    }
  }, [swrKey]);

  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete task');
      }
      mutate(swrKey, (prevTasks: typeof tasks) =>
        (prevTasks || []).filter(task => task.id !== taskId), false); // Update SWR cache
      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      return false;
    }
  }, [swrKey]);

  const getTask = useCallback(async (taskId: string): Promise<(Task & { assignedTo?: User; assignedBy?: User }) | null> => {
    try {
      // For a single task, it's often better to fetch directly
      // or use a separate SWR key if this is frequently accessed directly.
      const response = await fetch(`/api/tasks/${taskId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch task');
      }

      const task = await response.json();
      return task;
    } catch (err) {
      console.error('Error fetching single task:', err);
      return null;
    }
  }, []); // No specific dependencies needed here unless the base URL changes

  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
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
      mutate(swrKey, (prevTasks: typeof tasks) =>
        (prevTasks || []).map(task =>
          task.id === taskId ? { ...task, ...updatedTask } : task
        ), false); // Update SWR cache
      return true;
    } catch (err) {
      console.error('Error updating task status:', err);
      return false;
    }
  }, [swrKey]);


  return {
    tasks: currentTasks,
    isLoading,
    error: error ? error.message : null, // Extract message from SWR error object
    createTask,
    updateTask,
    deleteTask,
    getTask,
    updateTaskStatus,
    refreshTasks
  };
};