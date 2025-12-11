"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import Logo from '../Logo/Logo';
import styles from './Sidebar.module.css';
import {
    Home,
    CheckSquare,
    BookOpen,
    BarChart2,
    Settings,
    Calendar,
    CalendarRange,
    Trophy,
    Star
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';

// Props for mobile toggle
interface SidebarProps {
    open?: boolean;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ open = false }) => {
    const pathname = usePathname();
    const { user } = useAuth();
    const { userPoints } = useLeaderboard();

    const displayName = useMemo(() =>
        user?.user_metadata?.custom_full_name ||
        user?.user_metadata?.full_name ||
        user?.email?.split('@')[0] ||
        'User',
        [user]);

    const avatarUrl = useMemo(() =>
        user?.user_metadata?.custom_avatar_url || user?.user_metadata?.avatar_url,
        [user]);

    const initial = useMemo(() =>
        displayName.charAt(0).toUpperCase(),
        [displayName]);

    const navItems = useMemo(() => [
        { name: 'Daily Goal', href: '/', icon: Home },
        { name: 'Weekly Goals', href: '/weekly', icon: Calendar },
        { name: 'Monthly Goals', href: '/monthly', icon: CalendarRange },
        { name: 'Syllabus', href: '/syllabus', icon: BookOpen },
        { name: 'Analytics', href: '/analytics', icon: BarChart2 },
        { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    ], []);

    return (
        <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
            <div className={styles.logo}>
                <Logo size="medium" />
            </div>

            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            <Icon size={18} className={styles.icon} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.sidebarFooter}>
                <div style={{
                    padding: '0.5rem',
                    marginBottom: '0.5rem',
                    background: 'rgba(255, 215, 0, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#f59e0b',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                }}>
                    <Star size={16} fill="#f59e0b" />
                    <span>{userPoints || 0} Points</span>
                </div>
                <Link href="/profile" className={styles.userProfile} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={displayName}
                            className={styles.userAvatar}
                            style={{ objectFit: 'cover', backgroundColor: 'transparent' }}
                        />
                    ) : (
                        <div className={styles.userAvatar}>{initial}</div>
                    )}
                    <span className="text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                        {displayName}
                    </span>
                </Link>
                <ThemeToggle />
            </div>
        </aside>
    );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
