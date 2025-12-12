'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useMonthlyGoals } from '@/hooks/useMonthlyGoals';

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
    const { goals, loading, saveGoals, updateGoalCompletion, updateGoalTitle, user } = useMonthlyGoals();

    const getMonthKey = (date: Date) => {
        return `${date.getFullYear()}-${date.getMonth()}`;
    };

    const getISODate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
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
    const daysInMonth = getDaysInMonth(currentMonth);

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
        const updatedGoals = currentGoals.filter(g => g.id !== id);
        await saveGoals(monthKey, updatedGoals);
    };

    const formatMonthYear = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

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
                <div>
                    <span>Monthly Goals</span>
                </div>
            </header>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={`${styles.th} ${styles.goalColumn}`}>Goal</th>
                            {daysInMonth.map((day, index) => (
                                <th key={index} className={`${styles.th} ${styles.thDay}`}>
                                    {day.getDate()}
                                </th>
                            ))}
                            <th className={styles.th} style={{ minWidth: '40px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentGoals.length === 0 ? (
                            <tr>
                                <td colSpan={daysInMonth.length + 2} className={styles.td} style={{ textAlign: 'center', color: 'var(--fg-secondary)', padding: '2rem' }}>
                                    No monthly goals yet. Click the button below to add one!
                                </td>
                            </tr>
                        ) : (
                            currentGoals.map((goal) => (
                                <tr key={goal.id} className={styles.tr}>
                                    <td className={`${styles.td} ${styles.goalColumn}`}>
                                        <DebouncedInput
                                            value={goal.title}
                                            onSave={(val) => handleUpdateTitle(goal.id, val)}
                                            placeholder="Enter goal..."
                                            className={styles.goalInput}
                                        />
                                    </td>
                                    {daysInMonth.map((day, index) => {
                                        const dateStr = getISODate(day);
                                        const isCompleted = goal.completedDays?.[dateStr] || false;
                                        return (
                                            <td key={index} className={`${styles.td} ${styles.checkboxCell}`}>
                                                <div
                                                    className={`${styles.checkbox} ${isCompleted ? styles.checked : ''}`}
                                                    onClick={() => toggleDay(goal.id, dateStr)}
                                                    title={`${day.toLocaleDateString()} - ${isCompleted ? 'Completed' : 'Not completed'}`}
                                                >
                                                    {isCompleted && <span className={styles.checkIcon}>✓</span>}
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className={styles.td}>
                                        <button
                                            onClick={() => deleteGoal(goal.id)}
                                            className={styles.deleteBtn}
                                            title="Delete goal"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <button onClick={addGoal} className={styles.addGoalBtn}>
                <Plus size={20} />
                <span>Add Monthly Goal</span>
            </button>
        </div>
    );
}
