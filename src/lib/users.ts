export interface User {
  id: string
  email: string
  role: 'admin' | 'user'
  name: string
  provider: string
  created: string
  lastLogin?: string
}

export interface UsersData {
  users: Record<string, User>
}

/**
 * Create a new user object
 */
export function createUser(data: {
  id: string
  email: string
  name: string
  provider: string
}): User {
  return {
    id: data.id,
    email: data.email,
    role: isAdminEmail(data.email) ? 'admin' : 'user',
    name: data.name,
    provider: data.provider,
    created: new Date().toISOString(),
  }
}

/**
 * Check if an email address should be an admin
 */
function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
  return adminEmails.includes(email)
}

/**
 * Update user's last login timestamp
 */
export function updateUserLastLogin(user: User): User {
  return {
    ...user,
    lastLogin: new Date().toISOString(),
  }
}

/**
 * Change user role (admin only operation)
 */
export function changeUserRole(user: User, newRole: 'admin' | 'user'): User {
  return {
    ...user,
    role: newRole,
  }
} 