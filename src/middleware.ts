// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Allow access to auth API routes
    if (pathname.startsWith('/api/auth')) {
      return NextResponse.next();
    }

    const isAuth = !!token;
    const isAuthPage = pathname.startsWith('/auth');
    const isAdminPage = pathname.startsWith('/admin');
    const isTeamPage = pathname.startsWith('/team');

    // Redirect to signin if not authenticated and trying to access protected routes
    if (!isAuth && (isAdminPage || isTeamPage)) {
      const signInUrl = new URL('api/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(signInUrl);
    }

    // Redirect to appropriate dashboard if authenticated and on auth pages
    if (isAuth && isAuthPage) {
      const redirectUrl = token?.role === 'ADMIN' ? '/admin/dashboard' : '/team/dashboard';
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    // Check role-based access
    if (isAuth) {
      const userRole = token?.role;

      // Admin trying to access team routes - redirect to admin dashboard
      if (userRole === 'ADMIN' && isTeamPage) {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      }

      // Team member trying to access admin routes - redirect to team dashboard
      if (userRole === 'TEAM_MEMBER' && isAdminPage) {
        return NextResponse.redirect(new URL('/team/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Always allow access to auth API routes
        if (pathname.startsWith('/api/auth')) {
          return true;
        }

        // Allow access to public routes
        if (pathname === '/' || pathname.startsWith('/auth')) {
          return true;
        }

        // Allow access to other API routes (they should handle their own auth)
        if (pathname.startsWith('/api/')) {
          return true;
        }

        // Require authentication for protected routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};