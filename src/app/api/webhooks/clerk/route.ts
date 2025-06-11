import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { authLogger } from '@/lib/logger'

interface ClerkWebhookEvent {
  type: string
  data: {
    id: string
    email_addresses: Array<{
      email_address: string
      verification?: {
        status: string
      }
    }>
    first_name?: string
    last_name?: string
    image_url?: string
    external_accounts?: Array<{
      provider: string
    }>
  }
}

export async function POST(req: NextRequest) {
  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)

  let evt: ClerkWebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkWebhookEvent
  } catch (err) {
    authLogger.error('Error verifying webhook', { error: err })
    return NextResponse.json({ message: 'Invalid signature' }, { status: 400 })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created') {
    try {
      if (!evt.data.email_addresses || evt.data.email_addresses.length === 0) {
        authLogger.error('No email found in user.created event', { 
          userId: evt.data.id 
        })
        return NextResponse.json({ message: 'No email found' }, { status: 400 })
      }

      const email = evt.data.email_addresses[0].email_address
      const firstName = evt.data.first_name || ''
      const lastName = evt.data.last_name || ''
      const provider = evt.data.external_accounts?.[0]?.provider || 'clerk'

      authLogger.info('User created', { 
        id: evt.data.id, 
        email, 
        firstName, 
        lastName, 
        provider 
      })

      return NextResponse.json({ success: true, user: { id: evt.data.id, email, firstName, lastName, provider } })
    } catch (error) {
      authLogger.error('Error processing user.created webhook', { error })
      return NextResponse.json({ message: 'Error processing webhook' }, { status: 500 })
    }
  }

  return new Response('', { status: 200 })
} 