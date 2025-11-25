'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useWeeklyGoals } from '@/hooks/useWeeklyGoals';
import { useMonthlyGoals } from '@/hooks/useMonthlyGoals';

// Debounced Input Component
const DebouncedInput = ({
    value: initialValue,
    onSave,
    placeholder,
    className,
    readOnly = false
}: {
    value: string,
    onSave: (val: string) => void,
    placeholder?: string,
    className?: string,
    readOnly?: boolean
}) => {
    const [value, setValue] = useState(initialValue);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (readOnly) return;

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
        if (readOnly) return;

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
            readOnly={readOnly}
            style={{ cursor: readOnly ? 'default' : 'text' }}
        />
    );
};

interface WeeklyGoalWithSource {
    id: string;
    title: string;
    completedDays: { [date: string]: boolean };
    source?: 'weekly' | 'monthly';
    parentId?: string;
}

export default function WeeklyPage() {
    const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
    const [allGoals, setAllGoals] = useState<WeeklyGoalWithSource[]>([]);

    const { goals, loading, saveGoals, updateGoalCompletion, updateGoalTitle, user } = useWeeklyGoals();
    const { goals: monthlyGoals, loading: monthlyLoading, updateGoalCompletion: updateMonthlyCompletion } = useMonthlyGoals();

    function getStartOfWeek(d: Date) {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    const getWeekKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getISODate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getDaysOfWeek = (start: Date) => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            days.push(day);
        }
        return days;
    };

    const changeWeek = (weeks: number) => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + (weeks * 7));
        setCurrentWeekStart(getStartOfWeek(newDate));
    };

    const isCurrentWeek = () => {
        const today = getStartOfWeek(new Date());
        return currentWeekStart.getTime() === today.getTime();
    };

    const weekKey = getWeekKey(currentWeekStart);
    const daysOfWeek = getDaysOfWeek(currentWeekStart);

    // Combine weekly and monthly goals - FIXED: removed daysOfWeek from dependencies
    useEffect(() => {
        const combined: WeeklyGoalWithSource[] = [];

        // Calculate days inside effect to avoid dependency issues
        const days = getDaysOfWeek(currentWeekStart);
        const firstDayOfWeek = days[0];
        const monthKey = `${firstDayOfWeek.getFullYear()}-${firstDayOfWeek.getMonth()}`;
        const monthGoals = monthlyGoals[monthKey] || [];

        monthGoals.forEach((goal) => {
            if (goal.title) {
                combined.push({
                    id: `monthly-${goal.id}`,
                    title: goal.title,
                    completedDays: goal.completedDays || {},
                    source: 'monthly',
                    parentId: goal.id
                });
            }
        });

        // Add weekly goals
        const weekGoals = goals[weekKey] || [];
        weekGoals.forEach((goal) => {
            combined.push({
                ...goal,
                source: 'weekly'
            });
        });

        setAllGoals(combined);
    }, [goals, monthlyGoals, weekKey, currentWeekStart]);

    const addGoal = async () => {
        const weekGoals = goals[weekKey] || [];
        const newGoal = {
            id: Math.random().toString(36).substr(2, 9),
            title: '',
            completedDays: {}
        };
        await saveGoals(weekKey, [...weekGoals, newGoal]);
    };

    const handleUpdateTitle = (goal: WeeklyGoalWithSource, title: string) => {
        if (goal.source === 'monthly') return;
        updateGoalTitle(weekKey, goal.parentId || goal.id, title);
    };

    const toggleDay = async (goal: WeeklyGoalWithSource, dateStr: string) => {
        const currentStatus = goal.completedDays?.[dateStr] || false;

        if (goal.source === 'monthly' && goal.parentId) {
            const days = getDaysOfWeek(currentWeekStart);
            const firstDayOfWeek = days[0];
            const monthKey = `${firstDayOfWeek.getFullYear()}-${firstDayOfWeek.getMonth()}`;
            await updateMonthlyCompletion(monthKey, goal.parentId, dateStr, !currentStatus);
        } else {
            await updateGoalCompletion(weekKey, goal.parentId || goal.id, dateStr, !currentStatus);
        }
    };

    const deleteGoal = async (goal: WeeklyGoalWithSource) => {
        if (goal.source === 'monthly') return;

        const weekGoals = goals[weekKey] || [];
        const updatedGoals = weekGoals.filter(g => g.id !== (goal.parentId || goal.id));
        await saveGoals(weekKey, updatedGoals);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (!user) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <h2>Please log in to view your weekly goals</h2>
                    <p>Your data will be synced across all your devices once you log in.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.weekNavigation}>
                    <button onClick={() => changeWeek(-1)} className={styles.navButton}>
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className={styles.weekTitle}>
                        Week of {formatDate(currentWeekStart)}
                        {(loading || monthlyLoading) && (
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
                        onClick={() => !isCurrentWeek() && changeWeek(1)}
                        className={styles.navButton}
                        style={{ opacity: isCurrentWeek() ? 0 : 1, cursor: isCurrentWeek() ? 'default' : 'pointer' }}
                        disabled={isCurrentWeek()}
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>
                <div>
                    <span>Weekly Goals</span>
                </div>
            </header>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th} style={{ width: '40%' }}>Goal</th>
                            {daysOfWeek.map((day, index) => (
                                <th key={index} className={`${styles.th} ${styles.thDay}`}>
                                    <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                    <div>{day.getDate()}</div>
                                </th>
                            ))}
                            <th className={styles.th} style={{ width: '50px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {allGoals.length === 0 ? (
                            <tr>
                                <td colSpan={9} className={styles.td} style={{ textAlign: 'center', color: 'var(--fg-secondary)' }}>
                                    No weekly goals yet. Click the button below to add one!
                                </td>
                            </tr>
                        ) : (
                            allGoals.map((goal) => (
                                <tr key={goal.id} className={styles.tr}>
                                    <td className={styles.td} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <DebouncedInput
                                            value={goal.title}
                                            onSave={(val) => handleUpdateTitle(goal, val)}
                                            placeholder="Enter goal..."
                                            className={styles.goalInput}
                                            readOnly={goal.source === 'monthly'}
                                        />
                                        {goal.source === 'monthly' && (
                                            <span style={{
                                                fontSize: '0.75rem',
                                                color: '#f2994a',
                                                border: '1px solid #f2994a',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                monthly
                                            </span>
                                        )}
                                    </td>
                                    {daysOfWeek.map((day, index) => {
                                        const dateStr = getISODate(day);
                                        const isCompleted = goal.completedDays?.[dateStr] || false;
                                        return (
                                            <td key={index} className={`${styles.td} ${styles.checkboxCell}`}>
                                                <div
                                                    className={`${styles.checkbox} ${isCompleted ? styles.checked : ''}`}
                                                    onClick={() => toggleDay(goal, dateStr)}
                                                >
                                                    {isCompleted && <span className={styles.checkIcon}>✓</span>}
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className={styles.td}>
                                        {goal.source !== 'monthly' && (
                                            <button
                                                onClick={() => deleteGoal(goal)}
                                                className={styles.deleteBtn}
                                                title="Delete goal"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <button onClick={addGoal} className={styles.addGoalBtn}>
                <Plus size={20} />
                <span>Add Weekly Goal</span>
            </button>
        </div>
    );
}
