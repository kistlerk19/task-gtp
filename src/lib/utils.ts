// lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { TaskStatus, TaskPriority, TaskStatusColor, TaskPriorityColor } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const taskStatusColors: TaskStatusColor = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  overdue: 'bg-red-100 text-red-800 border-red-300',
}

export const taskPriorityColors: TaskPriorityColor = {
  low: 'bg-gray-100 text-gray-800 border-gray-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  urgent: 'bg-red-100 text-red-800 border-red-300',
}

export const formatDate = (date: Date | string): string => {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const formatDateTime = (date: Date | string): string => {
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatRelativeTime = (date: Date | string): string => {
  const d = new Date(date)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`
  
  return formatDate(d)
}

export const getDaysUntilDue = (dueDate: Date | string): number => {
  const due = new Date(dueDate)
  const now = new Date()
  const diffInTime = due.getTime() - now.getTime()
  return Math.ceil(diffInTime / (1000 * 3600 * 24))
}

export const isTaskOverdue = (dueDate: Date | string, status: TaskStatus): boolean => {
  if (status === 'completed') return false
  const due = new Date(dueDate)
  const now = new Date()
  return due < now
}

export const getTaskStatusLabel = (status: TaskStatus): string => {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'in_progress':
      return 'In Progress'
    case 'completed':
      return 'Completed'
    case 'overdue':
      return 'Overdue'
    default:
      return status
  }
}

export const getTaskPriorityLabel = (priority: TaskPriority): string => {
  switch (priority) {
    case 'low':
      return 'Low'
    case 'medium':
      return 'Medium'
    case 'high':
      return 'High'
    case 'urgent':
      return 'Urgent'
    default:
      return priority
  }
}

export const generateTaskId = (): string => {
  return `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substr(0, maxLength) + '...'
}

export const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const parseCoordinates = (coordinates: string | null): { lat: number; lng: number } | null => {
  if (!coordinates) return null
  
  try {
    const parsed = JSON.parse(coordinates)
    if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
      return parsed
    }
  } catch (error) {
    console.error('Failed to parse coordinates:', error)
  }
  
  return null
}

export const formatCoordinates = (lat: number, lng: number): string => {
  return JSON.stringify({ lat, lng })
}

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeoutId === null) {
      func(...args)
      timeoutId = setTimeout(() => {
        timeoutId = null
      }, delay)
    }
  }
}

export const sortTasks = (tasks: any[], sortBy: string, sortOrder: 'asc' | 'desc' = 'asc') => {
  return [...tasks].sort((a, b) => {
    let aValue = a[sortBy]
    let bValue = b[sortBy]
    
    // Handle date sorting
    if (sortBy === 'dueDate' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    }
    
    // Handle string sorting
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })
}

export const filterTasks = (tasks: any[], filters: any) => {
  return tasks.filter(task => {
    // Status filter
    if (filters.status && task.status !== filters.status) {
      return false
    }
    
    // Priority filter
    if (filters.priority && task.priority !== filters.priority) {
      return false
    }
    
    // Assignee filter
    if (filters.assignedToId && task.assignedToId !== filters.assignedToId) {
      return false
    }
    
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      const searchableFields = [
        task.title,
        task.description,
        task.location,
        task.assignedTo?.name,
        task.createdBy?.name
      ].filter(Boolean)
      
      const matchesSearch = searchableFields.some(field => 
        field.toLowerCase().includes(searchTerm)
      )
      
      if (!matchesSearch) return false
    }
    
    // Date range filter
    if (filters.dueDate) {
      const taskDueDate = new Date(task.dueDate)
      
      if (filters.dueDate.from && taskDueDate < new Date(filters.dueDate.from)) {
        return false
      }
      
      if (filters.dueDate.to && taskDueDate > new Date(filters.dueDate.to)) {
        return false
      }
    }
    
    return true
  })
}