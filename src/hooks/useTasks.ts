// hooks/useTasks.ts
import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Task, TaskStatus, UpdateTaskData } from '@/lib/types';

// Fetcher function with better error handling
const fetcher = async (url: string): Promise<any> => {
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    
    throw new Error(errorMessage);
  }

  const text = await response.text();
  if (!text) {
    throw new Error('Empty response from server');
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('JSON parse error:', error, 'Response text:', text);
    throw new Error('Invalid JSON response from server');
  }
};

export function useTasks() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    data: tasks, 
    error, 
    isLoading, 
    mutate 
  } = useSWR<Task[]>('/api/tasks', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
    errorRetryCount: 3,
    errorRetryInterval: 1000,
  });

  const getTask = useCallback(async (id: string): Promise<Task | null> => {
    try {
      const task = await fetcher(`/api/tasks/${id}`);
      return task;
    } catch (error) {
      console.error('Error fetching task:', error);
      return null;
    }
  }, []);

  const updateTask = useCallback(async (
    id: string, 
    data: UpdateTaskData
  ): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const text = await response.text();
      if (text) {
        try {
          JSON.parse(text);
        } catch (error) {
          console.error('JSON parse error on update:', error);
          throw new Error('Invalid response from server');
        }
      }

      // Revalidate the tasks list
      await mutate();
      return true;
    } catch (error) {
      console.error('Error updating task:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [mutate]);

  const updateTaskStatus = useCallback(async (
    id: string, 
    status: TaskStatus
  ): Promise<boolean> => {
    return updateTask(id, { status });
  }, [updateTask]);

  const createTask = useCallback(async (data: any): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      // Revalidate the tasks list
      await mutate();
      return true;
    } catch (error) {
      console.error('Error creating task:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [mutate]);

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      // Revalidate the tasks list
      await mutate();
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [mutate]);

  const refreshTasks = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    tasks: tasks || [],
    isLoading,
    error: error?.message || null,
    isSubmitting,
    getTask,
    updateTask,
    updateTaskStatus,
    createTask,
    deleteTask,
    refreshTasks,
  };
}