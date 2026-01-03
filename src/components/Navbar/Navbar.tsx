"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import Logo from '../Logo/Logo';
import styles from './Navbar.module.css';
import {
    Home,
    BookOpen,
    BarChart2,
    Calendar,
    CalendarRange,
    Trophy,
    Star,
    Menu,
    X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';

const Navbar: React.FC = () => {
    const pathname = usePathname();
    const { user } = useAuth();
    const { userPoints } = useLeaderboard();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        <>
            <nav className={styles.navbar}>
                <div className={styles.leftSection}>
                    {/* Mobile Menu Toggle */}
                    <button
                        className={styles.mobileMenuButton}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    <Link href="/" className={styles.logoWrapper}>
                        <Logo size="small" />
                    </Link>

                    {/* Desktop Nav */}
                    <div className={styles.nav}>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            // Exact match for home, startsWith for others to handle sub-routes if needed
                            const isActive = item.href === '/'
                                ? pathname === '/'
                                : pathname.startsWith(item.href);

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                >
                                    <Icon size={18} />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div className={styles.rightSection}>
                    <div className={styles.pointsBadge}>
                        <Star size={14} fill="#f59e0b" />
                        <span>{userPoints || 0}</span>
                    </div>

                    <ThemeToggle />

                    <Link href="/profile" className={styles.userProfile} aria-label="Profile">
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
                        <span className={styles.userName}>
                            {displayName}
                        </span>
                    </Link>
                </div>
            </nav>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className={styles.mobileMenu}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.href === '/'
                            ? pathname === '/'
                            : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`${styles.mobileNavItem} ${isActive ? styles.activeMobile : ''}`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Icon size={20} />
                                {item.name}
                            </Link>
                        );
                    })}
                </div>
            )}
        </>
    );
};

export default Navbar;
