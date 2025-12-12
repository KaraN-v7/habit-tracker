'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import { useLeaderboard, UserDetails } from '@/hooks/useLeaderboard';
import { useAdmin } from '@/hooks/useAdmin';
import { Trophy, Medal, Award, HelpCircle, X, ChevronLeft, ChevronRight, Calendar, BookOpen, CheckCircle2, Clock, Target, Trash2, Shield, UserPlus } from 'lucide-react';

export default function LeaderboardPage() {
    const {
        leaderboard,
        loading,
        currentUser,
        currentDate,
        setCurrentDate,
        period,
        setPeriod,
        fetchUserDetails,
        resetProgress,
        refresh
    } = useLeaderboard();

    const { isAdmin, addAdmin, resetAllPoints } = useAdmin();

    const [showHowItWorks, setShowHowItWorks] = useState(false);
    const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
    const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Admin State
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [newAdminId, setNewAdminId] = useState('');

    // Reset State
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    // Date Navigation Handlers
    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (period === 'daily') {
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        } else if (period === 'weekly') {
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        } else if (period === 'monthly') {
            newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        }

        // Prevent future dates
        if (newDate > new Date()) return;

        setCurrentDate(newDate);
    };

    const isNextDisabled = () => {
        const today = new Date();
        const checkDate = new Date(currentDate);

        if (period === 'daily') {
            checkDate.setDate(checkDate.getDate() + 1);
            return checkDate > today;
        } else if (period === 'weekly') {
            checkDate.setDate(checkDate.getDate() + 7);
            return checkDate > today;
        } else {
            checkDate.setMonth(checkDate.getMonth() + 1);
            return checkDate > today;
        }
    };

    const getPeriodLabel = () => {
        if (period === 'daily') {
            return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        } else if (period === 'weekly') {
            const start = new Date(currentDate);
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        } else {
            return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
    };

    // Handle User Click
    const handleUserClick = async (user: any) => {
        setSelectedUser({
            id: user.user_id,
            name: user.display_name,
            avatar: user.avatar_url
        });
        setLoadingDetails(true);
        const details = await fetchUserDetails(user.user_id);
        setUserDetails(details);
        setLoadingDetails(false);
    };

    const handleReset = async (resetPeriod: 'today' | 'week' | 'month') => {
        if (window.confirm(`Are you sure you want to reset your progress for ${resetPeriod}? This will uncheck your tasks.`)) {
            await resetProgress(resetPeriod);
            setShowResetConfirm(false);
        }
    };

    const handleAddAdmin = async () => {
        if (!newAdminId.trim()) return;
        try {
            await addAdmin(newAdminId);
            alert('Admin added successfully!');
            setNewAdminId('');
            refresh();
        } catch (error) {
            console.error(error);
            alert('Failed to add admin.');
        }
    };

    const handleResetAll = async () => {
        if (window.confirm('WARNING: This will reset ALL points for EVERYONE. This action cannot be undone. Are you sure?')) {
            await resetAllPoints();
            refresh();
        }
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy size={24} className={styles.rank1} />;
        if (rank === 2) return <Medal size={24} className={styles.rank2} />;
        if (rank === 3) return <Award size={24} className={styles.rank3} />;
        return <span className={styles.rank}>{rank}</span>;
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Leaderboard</h1>
                    <p className={styles.subtitle}>Compete with others and track your progress</p>
                </div>
                <div className={styles.actions}>
                    {isAdmin && (
                        <button
                            className={styles.howItWorksBtn}
                            style={{ background: '#7c3aed', color: 'white', border: 'none' }}
                            onClick={() => setShowAdminPanel(true)}
                        >
                            <Shield size={18} />
                            Admin
                        </button>
                    )}
                    <button
                        className={styles.howItWorksBtn}
                        onClick={() => setShowHowItWorks(true)}
                    >
                        <HelpCircle size={18} />
                        How it Works
                    </button>
                    <button
                        className={styles.howItWorksBtn}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                        onClick={() => setShowResetConfirm(true)}
                    >
                        <Trash2 size={18} />
                        Reset My Points
                    </button>
                </div>
            </header>

            {/* Period Tabs */}
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

            {/* Date Navigation */}
            <div className={styles.dateNav}>
                <button onClick={() => navigateDate('prev')} className={styles.navBtn}>
                    <ChevronLeft size={20} />
                </button>
                <div className={styles.currentDate}>
                    <Calendar size={16} style={{ marginRight: '0.5rem', opacity: 0.7 }} />
                    {getPeriodLabel()}
                </div>
                <button
                    onClick={() => navigateDate('next')}
                    className={styles.navBtn}
                    disabled={isNextDisabled()}
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Leaderboard List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading leaderboard...</div>
            ) : (
                <div className={styles.list}>
                    {leaderboard.map((entry, index) => {
                        const rank = index + 1;
                        const isCurrentUser = currentUser?.id === entry.user_id;

                        return (
                            <div
                                key={entry.user_id}
                                className={`${styles.card} ${isCurrentUser ? styles.currentUser : ''}`}
                                onClick={() => handleUserClick(entry)}
                                style={{ cursor: 'pointer' }}
                            >
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
                                    {entry.total_points}
                                    <span className={styles.pointsLabel}>pts</span>
                                </div>
                            </div>
                        );
                    })}

                    {leaderboard.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            No data available for this period yet.
                        </div>
                    )}
                </div>
            )}

            {/* Reset Modal */}
            {showResetConfirm && (
                <div className={styles.modalOverlay} onClick={() => setShowResetConfirm(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={styles.closeBtn}
                            onClick={() => setShowResetConfirm(false)}
                        >
                            <X size={24} />
                        </button>

                        <h2 className={styles.modalTitle}>Reset My Progress</h2>
                        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                            Choose a period to reset. This will uncheck all tasks for that period and reset your points. This cannot be undone.
                        </p>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <button className={styles.howItWorksBtn} onClick={() => handleReset('today')} style={{ justifyContent: 'center', width: '100%' }}>
                                Reset Today's Points
                            </button>
                            <button className={styles.howItWorksBtn} onClick={() => handleReset('week')} style={{ justifyContent: 'center', width: '100%' }}>
                                Reset This Week's Points
                            </button>
                            <button className={styles.howItWorksBtn} onClick={() => handleReset('month')} style={{ justifyContent: 'center', width: '100%' }}>
                                Reset This Month's Points
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Panel Modal */}
            {showAdminPanel && (
                <div className={styles.modalOverlay} onClick={() => setShowAdminPanel(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={styles.closeBtn}
                            onClick={() => setShowAdminPanel(false)}
                        >
                            <X size={24} />
                        </button>

                        <h2 className={styles.modalTitle}>Admin Panel</h2>

                        <div className={styles.pointsSection}>
                            <h3>⚠️ Danger Zone</h3>
                            <button
                                className={styles.howItWorksBtn}
                                onClick={handleResetAll}
                                style={{
                                    justifyContent: 'center',
                                    width: '100%',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    marginBottom: '1rem'
                                }}
                            >
                                <Trash2 size={18} />
                                Reset ALL Points (Everyone)
                            </button>
                        </div>

                        <div className={styles.pointsSection}>
                            <h3>👤 Add Admin</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                                <input
                                    type="text"
                                    placeholder="Enter User UUID"
                                    className={styles.contentInput} // reusing potentially? check styles
                                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    value={newAdminId}
                                    onChange={(e) => setNewAdminId(e.target.value)}
                                />
                                <button
                                    className={styles.howItWorksBtn}
                                    onClick={handleAddAdmin}
                                    style={{ justifyContent: 'center', width: '100%' }}
                                >
                                    <UserPlus size={18} />
                                    Add Admin
                                </button>
                            </div>
                        </div>

                        <div className={styles.noteSection}>
                            <strong>Note:</strong> As an admin, you can now also edit past dates on the goals pages.
                        </div>
                    </div>
                </div>
            )}

            {/* User Details Modal */}
            {selectedUser && (
                <div className={styles.modalOverlay} onClick={() => setSelectedUser(null)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={styles.closeBtn}
                            onClick={() => setSelectedUser(null)}
                        >
                            <X size={24} />
                        </button>

                        <div className={styles.modalHeader}>
                            <img
                                src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${selectedUser.name || 'User'}`}
                                alt={selectedUser.name}
                                className={styles.modalAvatar}
                            />
                            <div>
                                <h2 className={styles.modalTitle}>{selectedUser.name || 'Anonymous User'}</h2>
                                <p className={styles.modalSubtitle}>{getPeriodLabel()}</p>
                            </div>
                        </div>

                        {loadingDetails ? (
                            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading details...</div>
                        ) : userDetails ? (
                            <div className={styles.statsGrid}>
                                {/* Points Summary */}
                                <div className={styles.statCard} style={{ gridColumn: '1 / -1', background: 'rgba(245, 158, 11, 0.1)', borderColor: '#f59e0b' }}>
                                    <div className={styles.statIcon} style={{ color: '#f59e0b' }}>
                                        <Trophy size={24} />
                                    </div>
                                    <div className={styles.statContent}>
                                        <div className={styles.statValue} style={{ color: '#f59e0b' }}>{userDetails.total_points}</div>
                                        <div className={styles.statLabel}>Total Points Earned</div>
                                    </div>
                                </div>

                                {/* Goals */}
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon} style={{ color: '#3b82f6' }}>
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div className={styles.statContent}>
                                        <div className={styles.statValue}>{userDetails.goals_completed}</div>
                                        <div className={styles.statLabel}>Goals Completed</div>
                                    </div>
                                </div>

                                {/* Study Hours */}
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon} style={{ color: '#8b5cf6' }}>
                                        <Clock size={24} />
                                    </div>
                                    <div className={styles.statContent}>
                                        <div className={styles.statValue}>{userDetails.study_hours.toFixed(1)}h</div>
                                        <div className={styles.statLabel}>Study Time</div>
                                    </div>
                                </div>

                                {/* Chapters */}
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon} style={{ color: '#10b981' }}>
                                        <BookOpen size={24} />
                                    </div>
                                    <div className={styles.statContent}>
                                        <div className={styles.statValue}>{userDetails.chapters_completed}</div>
                                        <div className={styles.statLabel}>Chapters Finished</div>
                                    </div>
                                </div>

                                {/* Subjects */}
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon} style={{ color: '#ec4899' }}>
                                        <Target size={24} />
                                    </div>
                                    <div className={styles.statContent}>
                                        <div className={styles.statValue}>{userDetails.subjects_completed}</div>
                                        <div className={styles.statLabel}>Subjects Completed</div>
                                    </div>
                                </div>

                                {/* Syllabus Progress (All Time) */}
                                <div className={styles.statCard} style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                                    <div style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span className={styles.statLabel}>Overall Syllabus Progress</span>
                                            <span className={styles.statValue} style={{ fontSize: '1rem' }}>{userDetails.syllabus_percentage}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    width: `${userDetails.syllabus_percentage}%`,
                                                    height: '100%',
                                                    background: '#10b981',
                                                    transition: 'width 0.5s ease'
                                                }}
                                            />
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                            {userDetails.syllabus_completed} of {userDetails.syllabus_total} chapters completed total
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div>No details available</div>
                        )}
                    </div>
                </div>
            )}

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
