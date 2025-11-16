import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Get session
  const { data: { session } } = await supabase.auth.getSession();
  const path = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback'];
  const isPublicRoute = publicRoutes.includes(path) || path.startsWith('/properties') || path.startsWith('/api/');

  // If not authenticated and trying to access protected route
  if (!session && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(redirectUrl);
  }

  // If authenticated, fetch user profile for role-based access
  if (session) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const userRole = profile?.role || 'customer';

    // Admin routes
    if (path.startsWith('/admin') && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/customer/dashboard', request.url));
    }

    // Agent/Broker routes
    if (path.match(/^\/[^/]+\/dashboard/) && !['agent', 'broker'].includes(userRole)) {
      return NextResponse.redirect(new URL('/customer/dashboard', request.url));
    }

    // Customer routes
    if (path.startsWith('/customer') && !['customer', 'admin'].includes(userRole)) {
      // Get company slug for agents/brokers
      const { data: agent } = await supabase
        .from('agents')
        .select('company_id')
        .eq('user_id', session.user.id)
        .single();

      if (agent?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('slug')
          .eq('id', agent.company_id)
          .single();
        
        return NextResponse.redirect(new URL(`/${company?.slug || 'dashboard'}/dashboard`, request.url));
      }
    }

    // Redirect to appropriate dashboard if accessing auth pages while logged in
    if (['/login', '/signup'].includes(path)) {
      let dashboardPath = '/customer/dashboard';
      
      switch (userRole) {
        case 'admin':
          dashboardPath = '/admin/dashboard';
          break;
        case 'agent':
        case 'broker':
          // Get company slug
          const { data: agent } = await supabase
            .from('agents')
            .select('company_id')
            .eq('user_id', session.user.id)
            .single();

          if (agent?.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('slug')
              .eq('id', agent.company_id)
              .single();
            
            dashboardPath = `/${company?.slug || 'dashboard'}/dashboard`;
          }
          break;
      }

      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
