
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
  id: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate?: Date | null
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  assignedToId?: string | null
  createdById: string
  location?: string | null
  coordinates?: string | null
  attachments: string[]
  notes?: string | null
  
  // Relations
  assignedTo?: User | null
  createdBy: User
}

export interface Notification {
  id: string
  title: string
  message: string
  isRead: boolean
  createdAt: Date
  userId: string
  taskId?: string | null
  
  // Relations
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

// API Response types
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

// Form types
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

// Email types
export interface EmailData {
  to: string
  subject: string
  template: string
  data: Record<string, any>
}

export interface TaskAssignmentEmail {
  taskTitle: string
  taskDescription: string
  assigneeName: string
  assigneeEmail: string
  dueDate?: string
  priority: TaskPriority
  adminName: string
}

export interface TaskUpdateEmail {
  taskTitle: string
  newStatus: TaskStatus
  assigneeName: string
  notes?: string
  completedAt?: string
}

export interface DeadlineReminderEmail {
  taskTitle: string
  dueDate: string
  assigneeName: string
  daysUntilDue: number
}

// Utility types
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