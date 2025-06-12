export interface User {
  id: string
  email: string
  role: 'admin' | 'family' | 'extended-family' | 'friend' | 'guest'
  name: string
  provider: string
  created: string
  lastLogin?: string
  approved: boolean
  approvedBy?: string
  approvedAt?: string
  status: 'pending' | 'approved' | 'suspended'
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
  const isAdmin = isAdminEmail(data.email);
  
  return {
    id: data.id,
    email: data.email,
    role: isAdmin ? 'admin' : 'guest', // New users start as guest
    name: data.name,
    provider: data.provider,
    created: new Date().toISOString(),
    approved: isAdmin, // Admins are auto-approved
    approvedBy: isAdmin ? 'system' : undefined,
    approvedAt: isAdmin ? new Date().toISOString() : undefined,
    status: isAdmin ? 'approved' : 'pending',
  }
}

/**
 * Check if an email address should be an admin
 */
function isAdminEmail(email: string): boolean {
  // Check both server-side and client-side environment variables
  const serverAdminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || []
  const publicAdminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || []
  
  // Combine both arrays and remove duplicates
  const allAdminEmails = [...new Set([...serverAdminEmails, ...publicAdminEmails])]
  
  return allAdminEmails.includes(email.trim())
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
export function changeUserRole(user: User, newRole: 'admin' | 'family' | 'extended-family' | 'friend' | 'guest'): User {
  return {
    ...user,
    role: newRole,
  }
}

/**
 * Approve a user (admin only operation)
 */
export function approveUser(user: User, approvedBy: string): User {
  return {
    ...user,
    approved: true,
    approvedBy,
    approvedAt: new Date().toISOString(),
    status: 'approved',
  }
}

/**
 * Promote a user to a new role (admin only operation)
 */
export function promoteUser(user: User, newRole: 'family' | 'extended-family' | 'friend', promotedBy: string): User {
  return {
    ...user,
    role: newRole,
    approved: true,
    approvedBy: promotedBy,
    approvedAt: new Date().toISOString(),
    status: 'approved',
  }
}

/**
 * Suspend a user (admin only operation)
 */
export function suspendUser(user: User): User {
  return {
    ...user,
    status: 'suspended',
  }
}

/**
 * Check if user has access to any content
 */
export function userHasAccess(user: User): boolean {
  return user.status === 'approved' && user.role !== 'guest';
} 