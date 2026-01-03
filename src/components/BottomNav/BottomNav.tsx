"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './BottomNav.module.css';
import {
    Home,
    BookOpen,
    BarChart2,
    Calendar,
    CalendarRange,
    Trophy,
} from 'lucide-react';

const BottomNav: React.FC = () => {
    const pathname = usePathname();

    const navItems = useMemo(() => [
        { name: 'Daily', href: '/', icon: Home },
        { name: 'Weekly', href: '/weekly', icon: Calendar },
        { name: 'Monthly', href: '/monthly', icon: CalendarRange },
        { name: 'Syllabus', href: '/syllabus', icon: BookOpen },
        { name: 'Analytics', href: '/analytics', icon: BarChart2 },
        { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    ], []);

    // Filter to 4-5 most important items for bottom nav if space is tight, or use all if they fit. 
    // YouTube has 5. We have 6. It might be crowded. 
    // Let's keep all 6 for now but carefully sized.

    return (
        <nav className={styles.bottomNav}>
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
                    >
                        <div className={styles.iconWrapper}>
                            <Icon size={20} />
                        </div>
                        <span>{item.name}</span>
                    </Link>
                );
            })}
        </nav>
    );
};

export default BottomNav;
