import { User, Task, Notification, CreateTaskData, UpdateTaskData } from './types';

// Mock data storage (replace with actual database in production)
let users: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@company.com',
    role: 'ADMIN',
    createdAt: new Date(),
    updatedAt: new Date(),
    avatar: null,
    emailVerified: null,
    image: null,
  },
  {
    id: '2',
    name: 'John Smith',
    email: 'john@company.com',
    role: 'TEAM_MEMBER',
    createdAt: new Date(),
    updatedAt: new Date(),
    avatar: null,
    emailVerified: null,
    image: null,
  },
  {
    id: '3',
    name: 'Sarah Johnson',
    email: 'sarah@company.com',
    role: 'TEAM_MEMBER',
    createdAt: new Date(),
    updatedAt: new Date(),
    avatar: null,
    emailVerified: null,
    image: null,
  },
];

let tasks: Task[] = [
  {
    id: '1',
    title: 'Site Inspection - Building A',
    description: 'Conduct safety inspection of Building A construction site',
    status: 'PENDING',
    priority: 'HIGH',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    assignedToId: '2',
    createdById: '1',
    location: '123 Construction Ave',
    coordinates: null,
    attachments: [],
    notes: null,
    assignedTo: users[1],
    createdBy: users[0],
  },
  {
    id: '2',
    title: 'Equipment Maintenance',
    description: 'Perform routine maintenance on excavator equipment',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    assignedToId: '3',
    createdById: '1',
    location: null,
    coordinates: null,
    attachments: [],
    notes: null,
    assignedTo: users[2],
    createdBy: users[0],
  },
];

let notifications: Notification[] = [];

// User operations
export const getUsers = async (): Promise<User[]> => {
  return users;
};

export const getUserById = async (id: string): Promise<User | null> => {
  return users.find(user => user.id === id) || null;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  return users.find(user => user.email === email) || null;
};

// Task operations
export const getTasks = async (): Promise<Task[]> => {
  return tasks;
};

export const getTaskById = async (id: string): Promise<Task | null> => {
  return tasks.find(task => task.id === id) || null;
};

export const getTasksByUserId = async (userId: string): Promise<Task[]> => {
  return tasks.filter(task => task.assignedToId === userId);
};

export const createTask = async (data: CreateTaskData, createdById: string): Promise<Task> => {
  const assignedToUser = await getUserById(data.assignedToId || '');
  const createdByUser = await getUserById(createdById);
  if (!createdByUser) throw new Error('Invalid createdById');

  const newTask: Task = {
    id: Date.now().toString(),
    title: data.title,
    description: data.description || null,
    status: 'PENDING',
    priority: data.priority,
    dueDate: data.dueDate || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    assignedToId: data.assignedToId || null,
    createdById,
    location: data.location || null,
    coordinates: data.coordinates || null,
    attachments: [],
    notes: null,
    assignedTo: assignedToUser || null,
    createdBy: createdByUser,
  };

  tasks.push(newTask);

  // Create notification for assigned user
  if (data.assignedToId) {
    await createNotification({
      userId: data.assignedToId,
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${data.title}`,
      taskId: newTask.id,
    });
  }

  return newTask;
};

export const updateTask = async (id: string, data: UpdateTaskData): Promise<Task | null> => {
  const taskIndex = tasks.findIndex(task => task.id === id);
  if (taskIndex === -1) return null;

  const assignedToUser = data.assignedToId ? await getUserById(data.assignedToId) : tasks[taskIndex].assignedTo;

  tasks[taskIndex] = {
    ...tasks[taskIndex],
    title: data.title || tasks[taskIndex].title,
    description: data.description !== undefined ? data.description : tasks[taskIndex].description,
    status: data.status || tasks[taskIndex].status,
    priority: data.priority || tasks[taskIndex].priority,
    dueDate: data.dueDate !== undefined ? data.dueDate : tasks[taskIndex].dueDate,
    assignedToId: data.assignedToId !== undefined ? data.assignedToId : tasks[taskIndex].assignedToId,
    location: data.location !== undefined ? data.location : tasks[taskIndex].location,
    coordinates: data.coordinates !== undefined ? data.coordinates : tasks[taskIndex].coordinates,
    notes: data.notes !== undefined ? data.notes : tasks[taskIndex].notes,
    updatedAt: new Date(),
    completedAt: data.status === 'COMPLETED' ? new Date() : data.completedAt || tasks[taskIndex].completedAt,
    assignedTo: assignedToUser || tasks[taskIndex].assignedTo,
  };

  // Create notification for admin if task is completed
  if (data.status === 'COMPLETED') {
    const task = tasks[taskIndex];
    await createNotification({
      userId: task.createdById,
      title: 'Task Completed',
      message: `Task "${task.title}" has been completed`,
      taskId: task.id,
    });
  }

  return tasks[taskIndex];
};

// Notification operations
export const getNotificationsByUserId = async (userId: string): Promise<Notification[]> => {
  return notifications.filter(notification => notification.userId === userId);
};

export const createNotification = async (data: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Promise<Notification> => {
  const notification: Notification = {
    id: Date.now().toString(),
    title: data.title,
    message: data.message,
    isRead: false,
    createdAt: new Date(),
    userId: data.userId,
    taskId: data.taskId || null,
    user: users.find(u => u.id === data.userId) || users[0], // Default to first user if not found
    task: data.taskId ? tasks.find(t => t.id === data.taskId) || null : null,
  };

  notifications.push(notification);
  return notification;
};

export const markNotificationAsRead = async (id: string): Promise<boolean> => {
  const notificationIndex = notifications.findIndex(n => n.id === id);
  if (notificationIndex === -1) return false;

  notifications[notificationIndex].isRead = true;
  return true;
};

// Check for deadline warnings
export const checkDeadlineWarnings = async (): Promise<void> => {
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  for (const task of tasks) {
    if (task.status !== 'COMPLETED' && task.dueDate && task.dueDate <= twentyFourHoursFromNow && task.dueDate > now) {
      // Check if warning notification already exists
      const existingWarning = notifications.find(n =>
        n.taskId === task.id &&
        n.title === 'Deadline Warning' &&
        n.createdAt.toDateString() === now.toDateString()
      );

      if (!existingWarning) {
        await createNotification({
          userId: task.assignedToId || task.createdById,
          title: 'Deadline Warning',
          message: `Task "${task.title}" is due within 24 hours`,
          taskId: task.id,
        });
      }
    }
  }
};