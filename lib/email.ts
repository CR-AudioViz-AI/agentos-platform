// Email service using Resend API
// Simpler and more modern than SendGrid

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@agentos.com';
    this.fromName = process.env.RESEND_FROM_NAME || 'AgentOS';
  }

  /**
   * Send a single email
   */
  async sendEmail(options: EmailOptions): Promise<SendEmailResult> {
    if (!this.apiKey) {
      console.error('RESEND_API_KEY not configured');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from || `${this.fromName} <${this.fromEmail}>`,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send email');
      }

      const result = await response.json();
      
      return {
        success: true,
        messageId: result.id,
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(
    to: string,
    userName: string,
    userRole: string
  ): Promise<SendEmailResult> {
    const subject = 'Welcome to AgentOS!';
    const html = this.getWelcomeEmailTemplate(userName, userRole);
    
    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(
    to: string,
    userName: string,
    verificationUrl: string
  ): Promise<SendEmailResult> {
    const subject = 'Verify your AgentOS email';
    const html = this.getVerificationEmailTemplate(userName, verificationUrl);
    
    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    userName: string,
    resetUrl: string
  ): Promise<SendEmailResult> {
    const subject = 'Reset your AgentOS password';
    const html = this.getPasswordResetTemplate(userName, resetUrl);
    
    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send tour confirmation email
   */
  async sendTourConfirmationEmail(
    to: string,
    userName: string,
    propertyTitle: string,
    tourDate: string,
    tourTime: string
  ): Promise<SendEmailResult> {
    const subject = `Tour Confirmed: ${propertyTitle}`;
    const html = this.getTourConfirmationTemplate(
      userName,
      propertyTitle,
      tourDate,
      tourTime
    );
    
    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send agent approval notification
   */
  async sendAgentApprovalEmail(
    to: string,
    agentName: string
  ): Promise<SendEmailResult> {
    const subject = 'Your AgentOS agent application has been approved!';
    const html = this.getAgentApprovalTemplate(agentName);
    
    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send property inquiry notification to agent
   */
  async sendPropertyInquiryEmail(
    to: string,
    agentName: string,
    propertyTitle: string,
    customerName: string,
    customerEmail: string,
    customerPhone?: string,
    message?: string
  ): Promise<SendEmailResult> {
    const subject = `New inquiry for ${propertyTitle}`;
    const html = this.getPropertyInquiryTemplate(
      agentName,
      propertyTitle,
      customerName,
      customerEmail,
      customerPhone,
      message
    );
    
    return this.sendEmail({ 
      to, 
      subject, 
      html,
      replyTo: customerEmail,
    });
  }

  // Email Templates

  private getWelcomeEmailTemplate(userName: string, userRole: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to AgentOS!</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              
              <p>Thank you for joining AgentOS, the AI-powered real estate platform. We're excited to have you as a ${userRole}!</p>
              
              <p><strong>What's next?</strong></p>
              <ul>
                ${userRole === 'customer' ? `
                  <li>Browse our property listings</li>
                  <li>Save your favorite properties</li>
                  <li>Schedule property tours</li>
                  <li>Connect with top agents</li>
                ` : `
                  <li>Complete your profile</li>
                  <li>Add your first property listing</li>
                  <li>Connect with potential buyers</li>
                  <li>Explore our agent tools</li>
                `}
              </ul>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" class="button">Get Started</a>
              </div>
              
              <p>If you have any questions, our support team is here to help.</p>
              
              <p>Best regards,<br>The AgentOS Team</p>
            </div>
            <div class="footer">
              <p>© 2025 AgentOS. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getVerificationEmailTemplate(userName: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              
              <p>Thanks for signing up for AgentOS! Please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="background: #e5e7eb; padding: 10px; border-radius: 4px; word-break: break-all;">${verificationUrl}</p>
              
              <p>This link will expire in 24 hours.</p>
              
              <p>If you didn't create an account, you can safely ignore this email.</p>
              
              <p>Best regards,<br>The AgentOS Team</p>
            </div>
            <div class="footer">
              <p>© 2025 AgentOS. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordResetTemplate(userName: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="background: #e5e7eb; padding: 10px; border-radius: 4px; word-break: break-all;">${resetUrl}</p>
              
              <p>This link will expire in 1 hour.</p>
              
              <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
              
              <p>Best regards,<br>The AgentOS Team</p>
            </div>
            <div class="footer">
              <p>© 2025 AgentOS. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getTourConfirmationTemplate(
    userName: string,
    propertyTitle: string,
    tourDate: string,
    tourTime: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Tour Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              
              <p>Great news! Your property tour has been confirmed.</p>
              
              <div class="info-box">
                <strong>Tour Details:</strong><br>
                <strong>Property:</strong> ${propertyTitle}<br>
                <strong>Date:</strong> ${tourDate}<br>
                <strong>Time:</strong> ${tourTime}
              </div>
              
              <p>The agent will contact you shortly with additional details and directions.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/customer/dashboard" class="button">View Tour Details</a>
              </div>
              
              <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
              
              <p>Best regards,<br>The AgentOS Team</p>
            </div>
            <div class="footer">
              <p>© 2025 AgentOS. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getAgentApprovalTemplate(agentName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Application Approved!</h1>
            </div>
            <div class="content">
              <p>Hi ${agentName},</p>
              
              <p>Congratulations! Your agent application has been approved. You now have full access to our agent platform.</p>
              
              <p><strong>What you can do now:</strong></p>
              <ul>
                <li>Create and manage property listings</li>
                <li>Respond to customer inquiries</li>
                <li>Schedule and manage tours</li>
                <li>Access advanced analytics</li>
                <li>Connect with potential buyers</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" class="button">Access Your Dashboard</a>
              </div>
              
              <p>Welcome to the AgentOS family!</p>
              
              <p>Best regards,<br>The AgentOS Team</p>
            </div>
            <div class="footer">
              <p>© 2025 AgentOS. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getPropertyInquiryTemplate(
    agentName: string,
    propertyTitle: string,
    customerName: string,
    customerEmail: string,
    customerPhone?: string,
    message?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Property Inquiry</h1>
            </div>
            <div class="content">
              <p>Hi ${agentName},</p>
              
              <p>You have a new inquiry for <strong>${propertyTitle}</strong>.</p>
              
              <div class="info-box">
                <strong>Customer Information:</strong><br>
                <strong>Name:</strong> ${customerName}<br>
                <strong>Email:</strong> ${customerEmail}<br>
                ${customerPhone ? `<strong>Phone:</strong> ${customerPhone}<br>` : ''}
                ${message ? `<br><strong>Message:</strong><br>${message}` : ''}
              </div>
              
              <p>Please respond to this inquiry within 24 hours to maintain our quality standards.</p>
              
              <div style="text-align: center;">
                <a href="mailto:${customerEmail}" class="button">Reply to Customer</a>
              </div>
              
              <p>Best regards,<br>The AgentOS Team</p>
            </div>
            <div class="footer">
              <p>© 2025 AgentOS. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export types
export type { EmailOptions, SendEmailResult };
