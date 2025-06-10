import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'

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
    console.error('Error verifying webhook:', err)
    return new Response('Error occurred', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created') {
    try {
      const email = evt.data.email_addresses[0]?.email_address
      const firstName = evt.data.first_name || ''
      const lastName = evt.data.last_name || ''
      const provider = evt.data.external_accounts?.[0]?.provider || 'clerk'

      if (!email) {
        console.error('No email found in user.created event')
        return new Response('No email found', { status: 400 })
      }

      // TODO: In Stage 1.3, we'll implement JSON database operations
      // For now, just log the user creation
      console.log('User created:', { id: evt.data.id, email, firstName, lastName, provider })

      return NextResponse.json({ success: true, user: { id: evt.data.id, email, firstName, lastName, provider } })
    } catch (error) {
      console.error('Error processing user.created webhook:', error)
      return new Response('Error processing webhook', { status: 500 })
    }
  }

  return new Response('', { status: 200 })
} 