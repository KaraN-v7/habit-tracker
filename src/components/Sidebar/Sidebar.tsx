"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import Logo from '../Logo/Logo';
import styles from './Sidebar.module.css';
import {
    Home,
    BookOpen,
    BarChart2,
    Calendar,
    CalendarRange,
    Trophy,
    ChevronLeft,
    ChevronRight,
    Settings,
    LogOut,
    Zap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';

const Sidebar: React.FC = () => {
    const pathname = usePathname();
    const { user } = useAuth();
    const { userPoints } = useLeaderboard();
    // Default to expanded on desktop, could be persisted in local storage
    const [isCollapsed, setIsCollapsed] = useState(false);

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
        { name: 'Daily', href: '/', icon: Home },
        { name: 'Weekly', href: '/weekly', icon: Calendar },
        { name: 'Monthly', href: '/monthly', icon: CalendarRange },
        { name: 'Syllabus', href: '/syllabus', icon: BookOpen },
        { name: 'Analytics', href: '/analytics', icon: BarChart2 },
        { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    ], []);

    return (
        <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : styles.expanded}`}>
            <div className={styles.header}>
                <div className={styles.logoWrapper}>
                    <Logo size="small" />
                </div>
                {/* Fallback logo for collapsed state */}
                <div className={styles.collapsedLogo}>
                    <Image src="/logo-rounded.png" alt="HF" width={28} height={28} style={{ objectFit: 'contain' }} />
                </div>

                <button
                    className={styles.toggleBtn}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.href === '/'
                        ? pathname === '/'
                        : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                            title={isCollapsed ? item.name : ''}
                        >
                            <Icon size={20} />
                            <span className={styles.linkText}>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                {/* Points Display */}
                <div className={`${styles.pointsBadge} ${isCollapsed ? styles.pointsCollapsed : ''}`}>
                    <Zap size={16} fill="#f59e0b" className={styles.starIcon} />
                    <span className={styles.pointsText}>{userPoints || 0} Points</span>
                </div>

                <div style={{
                    padding: '0 4px',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: isCollapsed ? 'center' : 'flex-start'
                }}>
                    <ThemeToggle />
                </div>
                {/* In collapsed mode, ThemeToggle might be tricky layout-wise, can hide or just show icon if customized. 
                    For now simplifying by hiding or placing it differently if needed. 
                    Let's just hide text in ThemeToggle if it has any, currently it's usually an icon button. 
                */}

                <Link href="/profile" className={styles.userProfile}>
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={displayName}
                            className={styles.userAvatar}
                            style={{ objectFit: 'cover' }}
                        />
                    ) : (
                        <div className={styles.userAvatar}>{initial}</div>
                    )}
                    <div className={styles.userDetails}>
                        <span className={styles.userName}>{displayName}</span>
                        <span className={styles.userEmail}>{user?.email}</span>
                    </div>
                </Link>
            </div>
        </aside>
    );
};

export default Sidebar;
