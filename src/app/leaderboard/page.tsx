'use client';
import React, { useState } from 'react';
import styles from './page.module.css';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { Trophy, Medal, Award } from 'lucide-react';

export default function LeaderboardPage() {
    const { leaderboard, loading, currentUser } = useLeaderboard();
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    const getPoints = (entry: any) => {
        switch (period) {
            case 'daily': return entry.daily_points;
            case 'weekly': return entry.weekly_points;
            case 'monthly': return entry.monthly_points;
            default: return entry.total_points;
        }
    };

    const sortedLeaderboard = [...leaderboard].sort((a, b) => getPoints(b) - getPoints(a));

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy size={24} className={styles.rank1} />;
        if (rank === 2) return <Medal size={24} className={styles.rank2} />;
        if (rank === 3) return <Award size={24} className={styles.rank3} />;
        return <span className={styles.rank}>{rank}</span>;
    };

    if (loading) return (
        <div className={styles.container}>
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading leaderboard...</div>
        </div>
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Leaderboard</h1>
                <p className={styles.subtitle}>Compete with others and track your progress</p>
            </header>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${period === 'daily' ? styles.active : ''}`}
                    onClick={() => setPeriod('daily')}
                >
                    Daily
                </button>
                <button
                    className={`${styles.tab} ${period === 'weekly' ? styles.active : ''}`}
                    onClick={() => setPeriod('weekly')}
                >
                    Weekly
                </button>
                <button
                    className={`${styles.tab} ${period === 'monthly' ? styles.active : ''}`}
                    onClick={() => setPeriod('monthly')}
                >
                    Monthly
                </button>
            </div>

            <div className={styles.list}>
                {sortedLeaderboard.map((entry, index) => {
                    const rank = index + 1;
                    const isCurrentUser = currentUser?.id === entry.user_id;
                    const points = getPoints(entry);

                    // Skip users with 0 points if we want to be clean, but maybe show them?
                    // Let's show everyone for now.

                    return (
                        <div key={entry.user_id} className={`${styles.card} ${isCurrentUser ? styles.currentUser : ''}`}>
                            <div style={{ width: '3rem', display: 'flex', justifyContent: 'center' }}>
                                {getRankIcon(rank)}
                            </div>
                            <img
                                src={entry.avatar_url || `https://ui-avatars.com/api/?name=${entry.display_name || 'User'}`}
                                alt={entry.display_name}
                                className={styles.avatar}
                            />
                            <div className={styles.info}>
                                <div className={styles.name}>
                                    {entry.display_name || 'Anonymous User'}
                                    {isCurrentUser && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>(You)</span>}
                                </div>
                            </div>
                            <div className={styles.points}>
                                {points}
                                <span className={styles.pointsLabel}>pts</span>
                            </div>
                        </div>
                    );
                })}

                {sortedLeaderboard.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No data available for this period yet.
                    </div>
                )}
            </div>
        </div>
    );
}
