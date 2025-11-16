# Email Service Setup - Resend

## Required Environment Variables

Add these to your `.env.local` file for local development, and to Vercel environment variables for production:

```bash
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=AgentOS
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Setup Instructions

### 1. Create Resend Account
- Go to https://resend.com
- Sign up for free account (100 emails/day free tier)
- No credit card required for free tier

### 2. Get API Key
- Navigate to API Keys in dashboard
- Click "Create API Key"
- Give it a name (e.g., "AgentOS Production")
- Copy the key → `RESEND_API_KEY`
- **IMPORTANT:** Save this key securely, it won't be shown again

### 3. Verify Domain (Production Only)
For production emails, you must verify your domain:

1. Go to Domains in Resend dashboard
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the provided DNS records to your domain:
   - SPF record
   - DKIM records  
   - Custom domain tracking (optional)
5. Wait for verification (usually 1-15 minutes)

### 4. Set From Email
- After domain verification, you can use any email @ your domain
- Example: `noreply@yourdomain.com`
- Add to `RESEND_FROM_EMAIL`

### 5. Configure App URL
- Set `NEXT_PUBLIC_APP_URL` to your production URL
- Used for generating links in emails
- Example: `https://agentos.com`

## Email Types Supported

The platform sends these automated emails:

1. **Welcome Email**
   - Triggered: New user signup
   - Template: Welcome message with role-specific content

2. **Email Verification**
   - Triggered: New account creation
   - Template: Verification link with 24-hour expiry

3. **Password Reset**
   - Triggered: Password reset request
   - Template: Reset link with 1-hour expiry

4. **Tour Confirmation**
   - Triggered: Tour request approved
   - Template: Tour details with date/time

5. **Agent Approval**
   - Triggered: Admin approves agent application
   - Template: Welcome message with agent features

6. **Property Inquiry**
   - Triggered: Customer contacts agent
   - Template: Inquiry details with reply-to set to customer

## Testing Locally

For local development without Resend:
1. Leave `RESEND_API_KEY` empty
2. Emails will fail silently (won't crash app)
3. Check console logs for email content

To test with Resend:
1. Use free tier API key
2. Resend allows test emails to any address
3. Check Resend dashboard for delivery logs

## Usage in Code

### Send Email via API Route

```typescript
const response = await fetch('/api/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'welcome',
    data: {
      to: 'user@example.com',
      userName: 'John Doe',
      userRole: 'customer',
    },
  }),
});

const result = await response.json();
if (result.success) {
  console.log('Email sent:', result.messageId);
}
```

### Email Types

```typescript
// Welcome email
{
  type: 'welcome',
  data: { to, userName, userRole }
}

// Verification email
{
  type: 'verification',
  data: { to, userName, verificationUrl }
}

// Password reset
{
  type: 'password-reset',
  data: { to, userName, resetUrl }
}

// Tour confirmation
{
  type: 'tour-confirmation',
  data: { to, userName, propertyTitle, tourDate, tourTime }
}

// Agent approval
{
  type: 'agent-approval',
  data: { to, agentName }
}

// Property inquiry
{
  type: 'property-inquiry',
  data: { to, agentName, propertyTitle, customerName, customerEmail, customerPhone, message }
}
```

## Free Tier Limits

Resend free tier includes:
- 100 emails per day
- 3,000 emails per month
- All features included
- No time limit

Sufficient for testing and small-scale deployment.

## Production Recommendations

1. **Upgrade to paid plan** when exceeding free limits
   - $20/month for 50,000 emails
   - Volume discounts available

2. **Monitor delivery rates**
   - Check Resend dashboard regularly
   - Set up webhooks for bounces/complaints

3. **Implement email preferences**
   - Allow users to opt out of certain email types
   - Store preferences in database

4. **Track email metrics**
   - Opens, clicks, bounces
   - Use data to improve templates

5. **Handle failures gracefully**
   - Log failed emails
   - Implement retry logic
   - Alert admins of persistent failures

## Vercel Setup

1. Go to Project Settings → Environment Variables
2. Add each variable:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `RESEND_FROM_NAME`
   - `NEXT_PUBLIC_APP_URL`
3. Select environments (Production, Preview, Development)
4. Redeploy to apply changes

## Security Notes

1. **Never expose API key** in client-side code
2. **Use server-side only** for sending emails
3. **Validate recipients** before sending
4. **Rate limit** email sending to prevent abuse
5. **Sanitize user input** in email content

## Troubleshooting

**Emails not sending:**
- Check API key is correct
- Verify domain (for production)
- Check Resend dashboard for errors
- Verify FROM email matches verified domain

**Emails going to spam:**
- Ensure domain is verified
- Add SPF and DKIM records
- Avoid spam trigger words
- Test with mail-tester.com

**API errors:**
- Check console logs for details
- Verify all required fields provided
- Ensure user is authenticated
- Check Resend status page

## Alternative Services

If you prefer a different service:
- **SendGrid**: More features, more complex setup
- **Mailgun**: Good for developers
- **AWS SES**: Cost-effective at scale
- **Postmark**: Focus on transactional emails

The email service is abstracted, so you can swap Resend for another service by modifying `/lib/email.ts`.
