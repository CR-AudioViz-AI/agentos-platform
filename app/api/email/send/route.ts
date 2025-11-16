import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json();

    // Verify authentication (optional - remove if you want public API)
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let result;

    switch (type) {
      case 'welcome':
        result = await emailService.sendWelcomeEmail(
          data.to,
          data.userName,
          data.userRole
        );
        break;

      case 'verification':
        result = await emailService.sendVerificationEmail(
          data.to,
          data.userName,
          data.verificationUrl
        );
        break;

      case 'password-reset':
        result = await emailService.sendPasswordResetEmail(
          data.to,
          data.userName,
          data.resetUrl
        );
        break;

      case 'tour-confirmation':
        result = await emailService.sendTourConfirmationEmail(
          data.to,
          data.userName,
          data.propertyTitle,
          data.tourDate,
          data.tourTime
        );
        break;

      case 'agent-approval':
        result = await emailService.sendAgentApprovalEmail(
          data.to,
          data.agentName
        );
        break;

      case 'property-inquiry':
        result = await emailService.sendPropertyInquiryEmail(
          data.to,
          data.agentName,
          data.propertyTitle,
          data.customerName,
          data.customerEmail,
          data.customerPhone,
          data.message
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({ 
        success: true,
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
