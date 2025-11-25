'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';

export default function AppContent({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [authTimeout, setAuthTimeout] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Set a timeout to prevent infinite loading
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                console.warn('Authentication timeout - rendering app anyway');
                setAuthTimeout(true);
            }
        }, 5000); // 5 second timeout

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

    // If loading and timeout hasn't occurred, show loading spinner
    if (loading && !authTimeout) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div>Loading...</div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    Checking authentication...
                </div>
            </div>
        );
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

    // Mobile header with hamburger button
    const MobileHeader = (
        <header className="mobile-header">
            <button
                className="hamburger-button"
                aria-label="Toggle navigation"
                onClick={() => setSidebarOpen(!sidebarOpen)}
            >
                {/* Simple hamburger icon using three bars */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect y="4" width="24" height="2" fill="currentColor" />
                    <rect y="11" width="24" height="2" fill="currentColor" />
                    <rect y="18" width="24" height="2" fill="currentColor" />
                </svg>
            </button>
            <h1 className="text-xl" style={{ margin: 0, color: 'var(--fg-primary)' }}>Habit Tracker</h1>
        </header>
    );

    return (
        <>
            {MobileHeader}
            {/* Overlay for mobile sidebar */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />
            <div className="app-layout">
                <Sidebar open={sidebarOpen} />
                <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', width: '100%' }}>
                    <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}
