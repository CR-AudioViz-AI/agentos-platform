import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const role = requestUrl.searchParams.get('role');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = createClient();
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    if (data.user) {
      // Check if user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Create profile if it doesn't exist (for OAuth users)
      if (!profile && !profileError) {
        const userRole = role || 'customer';
        
        await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: data.user.email || '',
            first_name: data.user.user_metadata?.first_name || data.user.user_metadata?.full_name?.split(' ')[0] || '',
            last_name: data.user.user_metadata?.last_name || data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            role: userRole,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        // If agent or broker, create pending entry
        if (userRole === 'agent' || userRole === 'broker') {
          await supabase
            .from('agents')
            .insert({
              user_id: data.user.id,
              status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
        }
      }

      // Redirect based on role
      const userRole = profile?.role || role || 'customer';
      let redirectPath = '/customer/dashboard';

      switch (userRole) {
        case 'admin':
          redirectPath = '/admin/dashboard';
          break;
        case 'agent':
        case 'broker':
          // Get company slug for agent/broker
          const { data: agent } = await supabase
            .from('agents')
            .select('company_id')
            .eq('user_id', data.user.id)
            .single();

          if (agent?.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('slug')
              .eq('id', agent.company_id)
              .single();
            
            redirectPath = `/${company?.slug || 'dashboard'}/dashboard`;
          } else {
            redirectPath = '/dashboard'; // Generic dashboard for agents without company
          }
          break;
        default:
          redirectPath = '/customer/dashboard';
      }

      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  // If no code or auth failed, redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
