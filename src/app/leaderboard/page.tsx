'use client';
import React, { useState } from 'react';
import styles from './page.module.css';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { Trophy, Medal, Award, HelpCircle, X } from 'lucide-react';

export default function LeaderboardPage() {
    const { leaderboard, loading, currentUser } = useLeaderboard();
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [showHowItWorks, setShowHowItWorks] = useState(false);

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
                <div>
                    <h1 className={styles.title}>Leaderboard</h1>
                    <p className={styles.subtitle}>Compete with others and track your progress</p>
                </div>
                <button
                    className={styles.howItWorksBtn}
                    onClick={() => setShowHowItWorks(true)}
                >
                    <HelpCircle size={18} />
                    How it Works
                </button>
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

            {/* How it Works Modal */}
            {showHowItWorks && (
                <div className={styles.modalOverlay} onClick={() => setShowHowItWorks(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={styles.closeBtn}
                            onClick={() => setShowHowItWorks(false)}
                        >
                            <X size={24} />
                        </button>

                        <h2 className={styles.modalTitle}>How Points Work</h2>

                        <div className={styles.pointsSection}>
                            <h3>📝 Daily Goals</h3>
                            <div className={styles.pointItem}>
                                <span>Complete a task</span>
                                <strong>+2 points</strong>
                            </div>
                            <div className={styles.pointItem}>
                                <span>Study hours (per hour)</span>
                                <strong>+10 points</strong>
                            </div>
                            <div className={styles.example}>
                                Example: "Study Math 2 hours" = +2 (task) + +20 (hours) = <strong>22 points</strong>
                            </div>
                        </div>

                        <div className={styles.pointsSection}>
                            <h3>📚 Syllabus</h3>
                            <div className={styles.pointItem}>
                                <span>Complete a chapter</span>
                                <strong>+10 points</strong>
                            </div>
                            <div className={styles.pointItem}>
                                <span>Complete all chapters in a subject</span>
                                <strong>+20 points bonus</strong>
                            </div>
                            <div className={styles.pointItem}>
                                <span className={styles.highlight}>Complete ENTIRE syllabus</span>
                                <strong className={styles.highlight}>+100 points bonus!</strong>
                            </div>
                        </div>

                        <div className={styles.pointsSection}>
                            <h3>📅 Weekly & Monthly Goals</h3>
                            <div className={styles.pointItem}>
                                <span>Same as daily goals</span>
                                <strong>+2 per task, +10 per hour</strong>
                            </div>
                        </div>

                        <div className={styles.noteSection}>
                            <strong>Note:</strong> You can only check/uncheck tasks for the current date to prevent cheating. All syllabus progress counts regardless of date!
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
