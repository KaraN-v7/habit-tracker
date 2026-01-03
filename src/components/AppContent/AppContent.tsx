'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';

export default function AppContent({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [authTimeout, setAuthTimeout] = useState(false);

    // Set a timeout to prevent infinite loading
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                console.warn('Authentication timeout - rendering app anyway');
                setAuthTimeout(true);
            }
        }, 2000); // Reduced to 2 seconds for faster loading

        return () => clearTimeout(timer);
    }, [loading]);

    // Handle redirects in useEffect to avoid setState during render
    useEffect(() => {
        // Don't redirect while still loading (unless timeout occurred)
        if (loading && !authTimeout) return;

        // If on login/signup page and user is logged in, redirect to home
        if ((pathname === '/login' || pathname === '/signup') && user) {
            router.push('/');
            return;
        }

        // If not logged in, not on auth pages, and no timeout, redirect to login
        if (!user && !authTimeout && pathname !== '/login' && pathname !== '/signup') {
            router.push('/login');
            return;
        }
    }, [user, loading, authTimeout, pathname, router]);

    // If loading and timeout hasn't occurred, render nothing (fast initial paint)
    if (loading && !authTimeout) {
        return null; // Render nothing instead of loading spinner for faster perceived load
    }

    // If on login or signup page, just render children (public pages)
    if (pathname === '/login' || pathname === '/signup') {
        // Don't render if user is logged in (redirect will happen in useEffect)
        if (user) {
            return null;
        }
        return <>{children}</>;
    }

    // If not logged in and not on login page
    // Don't render if redirecting (redirect will happen in useEffect)
    if (!user && !authTimeout) {
        return null;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <Navbar />
            <main className="main-content" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%', position: 'relative' }}>
                {children}
            </main>
        </div>
    );
}
