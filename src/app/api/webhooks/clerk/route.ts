import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { usersDb, withRetry } from '@/lib/json-db'
import { isAdminEmail } from '@/lib/server-auth'
import type { UsersData, UserData } from '@/types/media'
import { authLogger } from '@/lib/logger'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the endpoint
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.text()

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    authLogger.error('Error verifying webhook', { error: err })
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 })
  }

  // Handle the webhook
  const clerkUserId = evt.data.id
  const eventType = evt.type

  if (!clerkUserId) {
    authLogger.error('No user ID found in webhook data')
    return NextResponse.json({ error: 'No user ID found' }, { status: 400 })
  }

  authLogger.info('Processing webhook', { userId: clerkUserId, eventType })

  if (eventType === 'user.created') {
    const user = evt.data
    const email = user.email_addresses?.[0]?.email_address

    if (!email) {
      authLogger.error('No email found for user', { userId: clerkUserId })
      return NextResponse.json({ error: 'No email found' }, { status: 400 })
    }

    authLogger.info('Creating user record', { email })

    // Determine if user is admin
    const userIsAdmin = isAdminEmail(email)
    const firstName = user.first_name || ''
    const lastName = user.last_name || ''
    const fullName = `${firstName} ${lastName}`.trim() || email.split('@')[0]
    
    // Create user record matching UserData interface
    const userData: UserData = {
      id: clerkUserId,
      email: email,
      role: userIsAdmin ? 'admin' : 'guest',
      name: fullName,
      provider: 'clerk',
      created: new Date().toISOString(),
      approved: userIsAdmin,
      approvedBy: userIsAdmin ? 'system' : undefined,
      approvedAt: userIsAdmin ? new Date().toISOString() : undefined,
      status: userIsAdmin ? 'approved' : 'pending',
    }

    try {
      // Read existing users
      const usersData: UsersData = await withRetry(() => usersDb.read())
      
      // Add new user
      usersData.users[clerkUserId] = userData
      
      // Save back to database
      await withRetry(() => usersDb.write(usersData))
      
      authLogger.info('User record created successfully', {
        email,
        role: userData.role,
        status: userData.status,
        approved: userData.approved
      })
    } catch (error) {
      authLogger.error('Error creating user record', { error })
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
  }

  return new Response('', { status: 200 })
} 