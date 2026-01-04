'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useMonthlyGoals, MonthlyGoal } from '@/hooks/useMonthlyGoals';
import Snackbar from '@/components/Snackbar/Snackbar';

// Debounced Input Component
const DebouncedInput = ({
    value: initialValue,
    onSave,
    placeholder,
    className
}: {
    value: string,
    onSave: (val: string) => void,
    placeholder?: string,
    className?: string
}) => {
    const [value, setValue] = useState(initialValue);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            onSave(newValue);
        }, 500);
    };

    const handleBlur = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        onSave(value);
    };

    return (
        <input
            type="text"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={className}
        />
    );
};

export default function MonthlyPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [newWinText, setNewWinText] = useState('');
    const { goals, wins, loading, saveGoals, updateGoalCompletion, updateGoalTitle, addWin, deleteWin, user } = useMonthlyGoals();

    // Undo State
    const [undoBackup, setUndoBackup] = useState<any[] | null>(null);
    const [showSnackbar, setShowSnackbar] = useState(false);

    const getMonthKey = (date: Date) => {
        return `${date.getFullYear()}-${date.getMonth()}`;
    };

    const getISODate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Calculate weeks in the month (chunks of 7 days)
    // Calculate weeks in the month (Standard Calendar Box Logic: Split on Sundays)
    const getWeeksInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const weeks = [];
        let currentWeek = [];

        for (let i = 1; i <= daysInMonth; i++) {
            const currentDay = new Date(year, month, i);
            currentWeek.push(currentDay);

            // If it's Sunday (0) or the last day of the month, close the week
            if (currentDay.getDay() === 0 || i === daysInMonth) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }
        return weeks;
    };

    const changeMonth = (months: number) => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + months);
        setCurrentMonth(newDate);
    };

    const isCurrentMonth = () => {
        const today = new Date();
        return currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear();
    };

    const monthKey = getMonthKey(currentMonth);
    const currentGoals = goals[monthKey] || [];
    const currentWins = wins[monthKey] || [];
    const weeks = getWeeksInMonth(currentMonth);
    const daysInMonth = weeks.flat();
    const todayStr = getISODate(new Date());

    const addGoal = async () => {
        const newGoal = {
            id: crypto.randomUUID(),
            title: '',
            completedDays: {}
        };
        await saveGoals(monthKey, [...currentGoals, newGoal]);
    };

    const handleUpdateTitle = (id: string, title: string) => {
        updateGoalTitle(monthKey, id, title);
    };

    const toggleDay = async (goalId: string, dateStr: string) => {
        const goal = currentGoals.find(g => g.id === goalId);
        if (!goal) return;

        const currentStatus = goal.completedDays?.[dateStr] || false;
        await updateGoalCompletion(monthKey, goalId, dateStr, !currentStatus);
    };

    const deleteGoal = async (id: string) => {
        if (!confirm("Are you sure you want to delete this monthly habit?")) return;

        setUndoBackup(currentGoals);
        setShowSnackbar(true);

        const updatedGoals = currentGoals.filter(g => g.id !== id);
        await saveGoals(monthKey, updatedGoals);
    };

    const handleUndo = async () => {
        if (undoBackup) {
            await saveGoals(monthKey, undoBackup);
            setShowSnackbar(false);
            setUndoBackup(null);
        }
    };

    const handleAddWin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWinText.trim()) return;
        addWin(monthKey, newWinText);
        setNewWinText('');
    };

    const formatMonthYear = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const calculateProgress = (goal: MonthlyGoal) => {
        if (!goal.completedDays) return 0;
        const totalDays = daysInMonth.length;
        const completedCount = Object.values(goal.completedDays).filter(Boolean).length;
        return Math.round((completedCount / totalDays) * 100);
    };

    // Calculate Footer Stats
    const getFooterStats = () => {
        const dailyCompletionPercentage: number[] = [];
        const dailyCompletedCount: number[] = [];
        const dailyTotalCount: number[] = [];

        daysInMonth.forEach(day => {
            const dateStr = getISODate(day);
            let yes = 0;
            let total = 0;
            currentGoals.forEach(g => {
                if (g.title) {
                    total++;
                    if (g.completedDays?.[dateStr]) yes++;
                }
            });
            dailyCompletedCount.push(yes);
            dailyTotalCount.push(total);
            dailyCompletionPercentage.push(total === 0 ? 0 : Math.round((yes / total) * 100));
        });

        return { dailyCompletionPercentage, dailyCompletedCount, dailyTotalCount };
    };

    const footerStats = getFooterStats();

    // Calculate Overall Monthly Stats
    const getTotalStats = () => {
        if (!currentGoals.length) return { monthlyCompletionPercentage: 0, totalCompletedTasks: 0, totalTasks: 0 };

        let totalTasks = 0;
        let totalCompletedTasks = 0;

        currentGoals.forEach(g => {
            if (g.title) {
                totalTasks += daysInMonth.length;
                if (g.completedDays) {
                    totalCompletedTasks += Object.values(g.completedDays).filter(Boolean).length;
                }
            }
        });

        const monthlyCompletionPercentage = totalTasks === 0 ? 0 : Math.round((totalCompletedTasks / totalTasks) * 100);
        return { monthlyCompletionPercentage, totalCompletedTasks, totalTasks };
    };

    const totalStats = getTotalStats();

    if (!user) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <h2>Please log in to view your monthly goals</h2>
                    <p>Your data will be synced across all your devices once you log in.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.monthNavigation}>
                    <button onClick={() => changeMonth(-1)} className={styles.navButton}>
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className={styles.monthTitle}>
                        {formatMonthYear(currentMonth)}
                        {loading && (
                            <span style={{
                                marginLeft: '1rem',
                                fontSize: '0.9rem',
                                color: 'var(--fg-secondary)'
                            }}>
                                ⟳
                            </span>
                        )}
                    </h1>
                    <button
                        onClick={() => !isCurrentMonth() && changeMonth(1)}
                        className={styles.navButton}
                        style={{ opacity: isCurrentMonth() ? 0 : 1, cursor: isCurrentMonth() ? 'default' : 'pointer' }}
                        disabled={isCurrentMonth()}
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* Compact Monthly Overview in Header */}
                <div className={styles.overviewCardCompact}>
                    <div style={{ marginRight: '1rem', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-secondary)', marginBottom: '0.2rem' }}>MONTHLY OVERVIEW</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                            {totalStats.totalCompletedTasks} / {totalStats.totalTasks} Habits
                        </div>
                    </div>
                    <svg viewBox="0 0 36 36" className={styles.circularChart} style={{ width: '50px', height: '50px' }}>
                        <path className={styles.circleBg}
                            d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#eee"
                            strokeWidth="3.8"
                        />
                        <path className={styles.circle}
                            strokeDasharray={`${totalStats.monthlyCompletionPercentage}, 100`}
                            d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="var(--accent-green)"
                            strokeWidth="3.8"
                            strokeLinecap="round"
                        />
                        {/* Removed text inside small circle to avoid clutter, using tooltip or side text instead */}
                    </svg>
                    <span style={{ marginLeft: '0.5rem', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-green)' }}>
                        {totalStats.monthlyCompletionPercentage}%
                    </span>
                </div>
            </header>

            <div className={styles.dashboardGrid}>
                {/* Main Tracker Section */}
                <div className={styles.trackerSection}>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={`${styles.th} ${styles.goalColumn}`} rowSpan={3} style={{ verticalAlign: 'middle', textAlign: 'center' }}>HABITS</th>
                                    {weeks.map((week, i) => {
                                        let label = `Week ${i + 1}`;
                                        const isFirstWeek = i === 0;
                                        const isLastWeek = i === weeks.length - 1;

                                        // "First X Days": If first week and it doesn't start on Monday (1)
                                        if (isFirstWeek && week[0].getDay() !== 1) {
                                            label = `First ${week.length} Days`;
                                        }
                                        // "Last X Days": If last week (and not also first) and doesn't end on Sunday (0)
                                        else if (isLastWeek && !isFirstWeek && week[week.length - 1].getDay() !== 0) {
                                            label = `Last ${week.length} Days`;
                                        }

                                        return (
                                            <th
                                                key={`week-${i}`}
                                                colSpan={week.length}
                                                className={`${styles.th} ${styles[`thWeek${(i % 6) + 1}`]}`}
                                                style={{ textAlign: 'center', borderBottom: 'none' }}
                                            >
                                                {label}
                                            </th>
                                        );
                                    })}
                                    <th className={styles.th} rowSpan={3}></th>
                                </tr>
                                <tr>
                                    {weeks.map((week, i) => (
                                        week.map((day, j) => {
                                            const dateStr = getISODate(day);
                                            const isToday = dateStr === todayStr;
                                            return (
                                                <th
                                                    key={`day-${i}-${j}`}
                                                    className={`${styles.th} ${styles.thDay} ${styles[`thWeek${(i % 6) + 1}`]} ${j === 0 && i > 0 ? styles.weekSeparator : ''} ${isToday ? styles.currentDay : ''}`}
                                                    style={{ borderBottom: 'none', fontSize: '0.7rem', color: '#555' }}
                                                >
                                                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                                </th>
                                            );
                                        })
                                    ))}
                                </tr>
                                <tr>
                                    {weeks.map((week, i) => (
                                        week.map((day, j) => {
                                            const dateStr = getISODate(day);
                                            const isToday = dateStr === todayStr;
                                            return (
                                                <th
                                                    key={`date-${i}-${j}`}
                                                    className={`${styles.th} ${styles.thDay} ${styles[`thWeek${(i % 6) + 1}`]} ${j === 0 && i > 0 ? styles.weekSeparator : ''} ${isToday ? styles.currentDay : ''}`}
                                                    style={{ borderTop: 'none', fontWeight: 'bold' }}
                                                >
                                                    {day.getDate()}
                                                </th>
                                            );
                                        })
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {currentGoals.length === 0 ? (
                                    <tr>
                                        <td colSpan={daysInMonth.length + 2} className={styles.td} style={{ textAlign: 'center', color: 'var(--fg-secondary)', padding: '2rem' }}>
                                            No monthly habits yet. Click the button below to add one!
                                        </td>
                                    </tr>
                                ) : (
                                    currentGoals.map((goal) => (
                                        <tr key={goal.id} className={styles.tr}>
                                            <td className={`${styles.td} ${styles.goalColumn}`}>
                                                <DebouncedInput
                                                    value={goal.title}
                                                    onSave={(val) => handleUpdateTitle(goal.id, val)}
                                                    placeholder="Enter habit..."
                                                    className={styles.goalInput}
                                                />
                                            </td>
                                            {weeks.map((week, weekIndex) => (
                                                week.map((day, dayIndex) => {
                                                    const dateStr = getISODate(day);
                                                    const isCompleted = goal.completedDays?.[dateStr] || false;
                                                    const weekClass = styles[`week${(weekIndex % 6) + 1}`];
                                                    // Add separator class to first day of each week (except week 1)
                                                    const isWeekStart = dayIndex === 0 && weekIndex > 0;
                                                    const isToday = dateStr === todayStr;

                                                    return (
                                                        <td
                                                            key={`${weekIndex}-${dayIndex}`}
                                                            className={`${styles.td} ${styles.checkboxCell} ${weekClass} ${isWeekStart ? styles.weekSeparator : ''} ${isToday ? styles.currentDay : ''}`}
                                                        >
                                                            <div
                                                                className={`${styles.checkbox} ${isCompleted ? styles.checked : ''}`}
                                                                onClick={() => toggleDay(goal.id, dateStr)}
                                                                title={`${day.toLocaleDateString()} - ${isCompleted ? 'Completed' : 'Not completed'}`}
                                                            >
                                                                {isCompleted && <span className={styles.checkIcon}>✓</span>}
                                                            </div>
                                                        </td>
                                                    );
                                                })
                                            ))}
                                            <td className={styles.td}>
                                                <button
                                                    onClick={() => deleteGoal(goal.id)}
                                                    className={styles.deleteBtn}
                                                    title="Delete habit"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}

                                {/* Footer Stats */}
                                {currentGoals.length > 0 && (
                                    <>
                                        <tr className={styles.footerRow}>
                                            <td className={`${styles.td} ${styles.footerLabel}`}>DAILY COMPLETION</td>
                                            {footerStats.dailyCompletionPercentage.map((pct, i) => (
                                                <td key={`pct-${i}`}>{pct}%</td>
                                            ))}
                                            <td></td>
                                        </tr>
                                        <tr className={styles.footerRow}>
                                            <td className={`${styles.td} ${styles.footerLabel}`}>Daily Completed</td>
                                            {footerStats.dailyCompletedCount.map((count, i) => (
                                                <td key={`cnt-${i}`}>{count}</td>
                                            ))}
                                            <td></td>
                                        </tr>
                                        <tr className={styles.footerRow}>
                                            <td className={`${styles.td} ${styles.footerLabel}`}>Daily Total</td>
                                            {footerStats.dailyTotalCount.map((total, i) => (
                                                <td key={`tot-${i}`}>{total}</td>
                                            ))}
                                            <td></td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <button onClick={addGoal} className={styles.addGoalBtn}>
                        <Plus size={20} />
                        <span>Add Monthly Habit</span>
                    </button>
                </div>

                {/* Bottom Section: Progress & Wins */}
                <div className={styles.bottomSection}>
                    <div className={styles.progressCard}>
                        <h3 className={styles.progressTitle}>Monthly Progress</h3>
                        {currentGoals.length === 0 ? (
                            <div style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem' }}>
                                Add habits to track progress
                            </div>
                        ) : (
                            currentGoals.map(goal => {
                                const progress = calculateProgress(goal);
                                const completedCount = goal.completedDays ? Object.values(goal.completedDays).filter(Boolean).length : 0;
                                const total = daysInMonth.length;
                                return (
                                    <div key={goal.id} className={styles.progressItem}>
                                        <div className={styles.progressLabel} style={{ marginBottom: '6px' }}>
                                            <span
                                                style={{ flex: 1, marginRight: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600, fontSize: '0.95rem' }}
                                                title={goal.title}
                                            >
                                                {goal.title || 'Untitled Habit'}
                                            </span>
                                            <span className={styles.progressValue} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', opacity: 0.9 }}>
                                                {completedCount}/{total} days ({progress}%)
                                            </span>
                                        </div>
                                        <div className={styles.progressBarContainer}>
                                            <div
                                                className={styles.progressBarFill}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className={styles.winsCard}>
                        <div className={styles.winsHeader}>
                            Wins of the Month So Far
                        </div>
                        <ul className={styles.winsList}>
                            {currentWins.length === 0 ? (
                                <li className={styles.winItem} style={{ color: 'var(--fg-secondary)', justifyContent: 'center' }}>
                                    No wins recorded yet
                                </li>
                            ) : (
                                currentWins.map((win) => (
                                    <li key={win.id} className={styles.winItem}>
                                        <span style={{ wordBreak: 'break-word', marginRight: '8px' }}>{win.content}</span>
                                        <button
                                            onClick={() => deleteWin(win.id)}
                                            className={styles.deleteBtn}
                                            style={{ opacity: 1, padding: '4px', flexShrink: 0 }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </li>
                                ))
                            )}
                        </ul>
                        <WinsInput onAdd={addWin} monthKey={monthKey} />
                    </div>
                </div>
            </div>

            <Snackbar
                message="Monthly habit deleted"
                isVisible={showSnackbar}
                onUndo={handleUndo}
                onClose={() => setShowSnackbar(false)}
                duration={5000}
            />
        </div>
    );
}

// Optimized Wins Input Component to prevent typing lag
const WinsInput = ({ onAdd, monthKey }: { onAdd: (key: string, text: string) => void, monthKey: string }) => {
    const [localText, setLocalText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!localText.trim()) return;
        onAdd(monthKey, localText);
        setLocalText('');
    };

    return (
        <form onSubmit={handleSubmit} className={styles.winInputContainer}>
            <input
                type="text"
                value={localText}
                onChange={(e) => setLocalText(e.target.value)}
                placeholder="Add a win..."
                className={styles.winInput}
            />
        </form>
    );
};
