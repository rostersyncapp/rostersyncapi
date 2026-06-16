import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        
        // Find the user by stripe_customer_id or metadata
        const supabaseUserId = session.metadata?.supabase_user_id;

        if (supabaseUserId) {
          await supabaseAdmin
            .from('profiles')
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: 'active',
              subscription_tier: 'pro'
            })
            .eq('id', supabaseUserId);
        } else {
           console.warn('Checkout session missing supabase_user_id metadata.');
           // Fallback: lookup by customerId
           await supabaseAdmin
             .from('profiles')
             .update({
               stripe_subscription_id: subscriptionId,
               subscription_status: 'active',
               subscription_tier: 'pro'
             })
             .eq('stripe_customer_id', customerId);
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: subscription.status,
            // You can also dynamically map the Stripe Price ID to a tier if you have multiple tiers
            subscription_tier: subscription.status === 'active' ? 'pro' : 'free'
          })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            subscription_tier: 'free'
          })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new NextResponse(null, { status: 200 });
  } catch (error: any) {
    console.error('Error handling Stripe webhook:', error);
    return new NextResponse('Webhook handler failed', { status: 500 });
  }
}
