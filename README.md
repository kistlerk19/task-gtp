# My Project

## Directory Structure

```plaintext
src/
├── app/
│   ├── admin/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── tasks/
│   │   │   ├── create/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── team/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── tasks/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── api/
│   │   ├── tasks/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── users/
│   │   │   └── route.ts
│   │   └── notifications/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Badge.tsx
│   │   └── Modal.tsx
│   ├── TaskCard.tsx
│   ├── TaskForm.tsx
│   ├── NotificationBell.tsx
│   ├── TaskStatusBadge.tsx
│   └── DeadlineWarning.tsx
├── lib/
│   ├── types.ts
│   ├── auth.ts
│   ├── utils.ts
│   └── data.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useTasks.ts
│   └── useNotifications.ts
└── middleware.ts