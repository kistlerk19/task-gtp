export enum Role {
  ADMIN = 'ADMIN',
  TEAM_MEMBER = 'TEAM_MEMBER'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}
// export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
// export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UPDATE = 'TASK_UPDATE'
  // Add other notification types as needed
}

export interface User {
  id: string
  email: string
  name: string
  role: Role
  avatar?: string | null
  createdAt: Date
  updatedAt: Date
  emailVerified?: Date | null
  image?: string | null
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null; // Changed from Date to string
  completedAt?: string | null; // Changed from Date to string
  createdAt: string; // Changed from Date to string
  updatedAt: string; // Changed from Date to string
  assignedToId?: string | null;
  createdById: string;
  location?: string | null;
  coordinates?: string | null;
  attachments?: string[];
  notes?: string | null;
  assignedTo?: User | null;
  createdBy: User;
  comments?: { // Added comments field
    id: string;
    content: string;
    author: string;
    createdAt: string;
  }[];
}

export interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType // Add the type field
  isRead: boolean
  createdAt: Date
  userId: string
  taskId?: string | null
  user: User
  task?: Task | null
}

export interface CreateTaskData {
  title: string
  description?: string
  priority: TaskPriority
  dueDate?: Date
  assignedToId?: string
  location?: string
  coordinates?: string
}

export interface UpdateTaskData {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: Date
  assignedToId?: string
  location?: string
  coordinates?: string
  notes?: string
  completedAt?: Date
}

export interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  assignedToId?: string
  dueDate?: {
    from?: Date
    to?: Date
  }
  search?: string
}

export interface DashboardStats {
  totalTasks: number
  pendingTasks: number
  inProgressTasks: number
  completedTasks: number
  overdueTasks: number
  urgentTasks: number
  teamMembers: number
}

export interface TaskWithUser extends Task {
  assignedTo: User | null
  createdBy: User
}

export interface NotificationWithTask extends Notification {
  task: Task | null
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface LoginForm {
  email: string
  password: string
}

export interface SignUpForm {
  name: string
  email: string
  password: string
  role?: Role
}

export interface TaskFormData {
  title: string
  description: string
  priority: TaskPriority
  dueDate: string
  assignedToId: string
  location: string
}

export interface EmailData {
  to: string
  subject: string
  template: string
  data: Record<string, any>
}

// lib/types.ts - Add these email types
export interface TaskAssignmentEmail {
  taskTitle: string;
  taskDescription: string;
  assigneeName: string;
  assigneeEmail: string;
  dueDate: string | null;
  priority: string;
  adminName: string;
}

export interface TaskUpdateEmail {
  taskTitle: string;
  newStatus: string;
  assigneeName: string;
  assigneeEmail: string;
  notes?: string;
  completedAt?: string;
}

export interface DeadlineReminderEmail {
  taskTitle: string;
  dueDate: string;
  assigneeName: string;
  assigneeEmail: string;
  daysUntilDue: number;
}



export type TaskStatusColor = {
  [key in TaskStatus]: string
}

export type TaskPriorityColor = {
  [key in TaskPriority]: string
}

export interface MenuItem {
  label: string
  href: string
  icon?: string
  active?: boolean
}