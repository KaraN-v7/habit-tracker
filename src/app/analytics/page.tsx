'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useDailyGoals } from '@/hooks/useDailyGoals';
import { useWeeklyGoals } from '@/hooks/useWeeklyGoals';
import { useMonthlyGoals } from '@/hooks/useMonthlyGoals';
import { useSubjectRecognition } from '@/hooks/useSubjectRecognition';

interface GoalStats {
    completed: number;
    total: number;
    studyHoursCompleted: number;
    studyHoursTotal: number;
}

interface TrendDataPoint {
    name: string; // Date label (e.g., "Mon", "Week 1", "Jan")
    completed: number;
    total: number;
    studyCompleted: number;
    studyTotal: number;
    [key: string]: any; // For dynamic subject keys
}

type ViewType = 'daily' | 'weekly' | 'monthly';

export default function AnalyticsPage() {
    const [viewType, setViewType] = useState<ViewType>('daily');
    const [stats, setStats] = useState<GoalStats>({ completed: 0, total: 0, studyHoursCompleted: 0, studyHoursTotal: 0 });
    const [subjectDistribution, setSubjectDistribution] = useState<{ [subject: string]: number }>({});
    const [subjectTaskDistribution, setSubjectTaskDistribution] = useState<{ [subject: string]: { total: number, completed: number } }>({});
    const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);

    const { goals: dailyGoals, loading: dailyLoading } = useDailyGoals();
    const { goals: weeklyGoals, loading: weeklyLoading } = useWeeklyGoals();
    const { goals: monthlyGoals, loading: monthlyLoading } = useMonthlyGoals();
    const { recognizeSubject, loading: subjectLoading } = useSubjectRecognition();

    const getDateKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const extractStudyHours = (text: string): number => {
        const patterns = [
            /(\d+\.?\d*)\s*(?:hours?|hrs?|h)/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return parseFloat(match[1]);
            }
        }
        return 0;
    };

    const extractSubject = (text: string): string | null => {
        const result = recognizeSubject(text);
        return result.canonical_name;
    };

    // Get color for a subject from the database
    const getSubjectColor = (subjectName: string): string => {
        const result = recognizeSubject(subjectName);
        return result.color || '#95a5a6'; // Default gray if no color
    };

    const isStudyRelated = (goal: any): boolean => {
        if (goal.chapterId) return true; // Always count syllabus chapters

        const text = goal.content || goal.title || '';
        const studyKeywords = [
            'study', 'revision', 'practice', 'learn', 'read', 'test', 'exam', 'homework', 'assignment', 'chapter',
            'math', 'maths', 'science', 'sci', 'english', 'eng', 'physics', 'phy', 'chemistry', 'chem', 'biology', 'bio',
            'sst', 'social', 'history', 'hist', 'geography', 'geo', 'civics', 'economics', 'eco',
            'hindi', 'sanskrit', 'sans', 'computer', 'comp', 'coding', 'programming', 'it', 'cs'
        ];
        const lowerText = text.toLowerCase();
        return studyKeywords.some(keyword => lowerText.includes(keyword));
    };

    const getWeekStart = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    };

    const getDaysOfWeek = (start: Date) => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const getDaysOfMonth = (date: Date) => {
        const days = [];
        const year = date.getFullYear();
        const month = date.getMonth();
        const d = new Date(year, month, 1);

        while (d.getMonth() === month) {
            days.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }
        return days;
    };

    const getStatsForPeriod = (
        date: Date,
        type: ViewType,
        allGoals: { daily: any, weekly: any, monthly: any }
    ) => {
        let completed = 0;
        let total = 0;
        let studyHoursCompleted = 0;
        let studyHoursTotal = 0;
        const subjectHours: { [subject: string]: number } = {};
        const subjectTasks: { [subject: string]: { total: number, completed: number } } = {};

        if (type === 'daily') {
            const dateKey = getDateKey(date);

            // Daily Goals
            const dayGoals = allGoals.daily[dateKey] || [];
            dayGoals.forEach((goal: any) => {
                if (goal.type === 'todo' && (!goal.source || goal.source === 'daily')) {
                    total++;
                    if (goal.completed) completed++;

                    const subject = extractSubject(goal.content);
                    if (subject) {
                        if (!subjectTasks[subject]) subjectTasks[subject] = { total: 0, completed: 0 };
                        subjectTasks[subject].total++;
                        if (goal.completed) subjectTasks[subject].completed++;
                    }

                    if (isStudyRelated(goal)) {
                        const hours = extractStudyHours(goal.content);
                        if (hours > 0) {
                            studyHoursTotal += hours;
                            if (goal.completed) studyHoursCompleted += hours;
                            if (subject && goal.completed) {
                                subjectHours[subject] = (subjectHours[subject] || 0) + hours;
                            }
                        }
                    }
                }
            });

            // Weekly Goals (for this day)
            const weekStart = getWeekStart(date);
            const weekKey = getDateKey(weekStart);
            const weekGoals = allGoals.weekly[weekKey] || [];
            weekGoals.forEach((goal: any) => {
                if (goal.title && (!goal.source || goal.source === 'weekly')) {
                    total++;
                    const isCompletedToday = goal.completedDays?.[dateKey] === true;
                    if (isCompletedToday) completed++;

                    const subject = extractSubject(goal.title);
                    if (subject) {
                        if (!subjectTasks[subject]) subjectTasks[subject] = { total: 0, completed: 0 };
                        subjectTasks[subject].total++;
                        if (isCompletedToday) subjectTasks[subject].completed++;
                    }

                    if (isStudyRelated(goal)) {
                        const hours = extractStudyHours(goal.title);
                        if (hours > 0) {
                            studyHoursTotal += hours;
                            if (isCompletedToday) studyHoursCompleted += hours;
                            if (subject && isCompletedToday) {
                                subjectHours[subject] = (subjectHours[subject] || 0) + hours;
                            }
                        }
                    }
                }
            });

            // Monthly Goals (for this day)
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            const monthGoals = allGoals.monthly[monthKey] || [];
            monthGoals.forEach((goal: any) => {
                if (goal.title) {
                    total++;
                    const isCompletedToday = goal.completedDays?.[dateKey] === true;
                    if (isCompletedToday) completed++;

                    const subject = extractSubject(goal.title);
                    if (subject) {
                        if (!subjectTasks[subject]) subjectTasks[subject] = { total: 0, completed: 0 };
                        subjectTasks[subject].total++;
                        if (isCompletedToday) subjectTasks[subject].completed++;
                    }

                    if (isStudyRelated(goal)) {
                        const hours = extractStudyHours(goal.title);
                        if (hours > 0) {
                            studyHoursTotal += hours;
                            if (isCompletedToday) studyHoursCompleted += hours;
                            if (subject && isCompletedToday) {
                                subjectHours[subject] = (subjectHours[subject] || 0) + hours;
                            }
                        }
                    }
                }
            });

        } else if (type === 'weekly') {
            const weekStart = getWeekStart(date);
            const weekDays = getDaysOfWeek(weekStart);
            const weekKey = getDateKey(weekStart);

            // 1. Daily Goals (aggregated for the week)
            weekDays.forEach(day => {
                const dateKey = getDateKey(day);
                const dayGoals = allGoals.daily[dateKey] || [];
                dayGoals.forEach((goal: any) => {
                    if (goal.type === 'todo' && (!goal.source || goal.source === 'daily')) {
                        total++;
                        if (goal.completed) completed++;

                        const subject = extractSubject(goal.content);
                        if (subject) {
                            if (!subjectTasks[subject]) subjectTasks[subject] = { total: 0, completed: 0 };
                            subjectTasks[subject].total++;
                            if (goal.completed) subjectTasks[subject].completed++;
                        }

                        if (isStudyRelated(goal)) {
                            const hours = extractStudyHours(goal.content);
                            if (hours > 0) {
                                studyHoursTotal += hours;
                                if (goal.completed) studyHoursCompleted += hours;
                                if (subject && goal.completed) {
                                    subjectHours[subject] = (subjectHours[subject] || 0) + hours;
                                }
                            }
                        }
                    }
                });
            });

            // 2. Weekly Goals
            const weekGoals = allGoals.weekly[weekKey] || [];
            weekGoals.forEach((goal: any) => {
                if (goal.title && (!goal.source || goal.source === 'weekly')) {
                    const completedDays = weekDays.filter(day => {
                        const dateKey = getDateKey(day);
                        return goal.completedDays?.[dateKey];
                    }).length;

                    total += weekDays.length;
                    completed += completedDays;

                    const subject = extractSubject(goal.title);
                    if (subject) {
                        if (!subjectTasks[subject]) subjectTasks[subject] = { total: 0, completed: 0 };
                        subjectTasks[subject].total += weekDays.length;
                        subjectTasks[subject].completed += completedDays;
                    }

                    if (isStudyRelated(goal)) {
                        const hours = extractStudyHours(goal.title);
                        if (hours > 0) {
                            studyHoursTotal += hours * weekDays.length;
                            studyHoursCompleted += hours * completedDays;
                            if (subject) {
                                subjectHours[subject] = (subjectHours[subject] || 0) + (hours * completedDays);
                            }
                        }
                    }
                }
            });

            // 3. Monthly Goals (overlapping with this week)
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            const monthGoals = allGoals.monthly[monthKey] || [];
            monthGoals.forEach((goal: any) => {
                if (goal.title) {
                    const completedDays = weekDays.filter(day => {
                        const dateKey = getDateKey(day);
                        return goal.completedDays?.[dateKey];
                    }).length;

                    total += weekDays.length;
                    completed += completedDays;

                    const subject = extractSubject(goal.title);
                    if (subject) {
                        if (!subjectTasks[subject]) subjectTasks[subject] = { total: 0, completed: 0 };
                        subjectTasks[subject].total += weekDays.length;
                        subjectTasks[subject].completed += completedDays;
                    }

                    if (isStudyRelated(goal)) {
                        const hours = extractStudyHours(goal.title);
                        if (hours > 0) {
                            studyHoursTotal += hours * weekDays.length;
                            studyHoursCompleted += hours * completedDays;
                            if (subject) {
                                subjectHours[subject] = (subjectHours[subject] || 0) + (hours * completedDays);
                            }
                        }
                    }
                }
            });

        } else if (type === 'monthly') {
            const monthDays = getDaysOfMonth(date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

            // 1. Daily Goals (aggregated for the month)
            monthDays.forEach(day => {
                const dateKey = getDateKey(day);
                const dayGoals = allGoals.daily[dateKey] || [];
                dayGoals.forEach((goal: any) => {
                    if (goal.type === 'todo' && (!goal.source || goal.source === 'daily')) {
                        total++;
                        if (goal.completed) completed++;

                        const subject = extractSubject(goal.content);
                        if (subject) {
                            if (!subjectTasks[subject]) subjectTasks[subject] = { total: 0, completed: 0 };
                            subjectTasks[subject].total++;
                            if (goal.completed) subjectTasks[subject].completed++;
                        }

                        if (isStudyRelated(goal)) {
                            const hours = extractStudyHours(goal.content);
                            if (hours > 0) {
                                studyHoursTotal += hours;
                                if (goal.completed) studyHoursCompleted += hours;
                                if (subject && goal.completed) {
                                    subjectHours[subject] = (subjectHours[subject] || 0) + hours;
                                }
                            }
                        }
                    }
                });
            });

            // 2. Weekly Goals (aggregated for the month)
            const processedWeeks = new Set<string>();
            monthDays.forEach(day => {
                const weekStart = getWeekStart(day);
                const weekKey = getDateKey(weekStart);

                if (!processedWeeks.has(weekKey)) {
                    processedWeeks.add(weekKey);
                    const weekGoals = allGoals.weekly[weekKey] || [];

                    weekGoals.forEach((goal: any) => {
                        if (goal.title && (!goal.source || goal.source === 'weekly')) {
                            const weekDays = getDaysOfWeek(weekStart);
                            const daysInMonth = weekDays.filter(d => d.getMonth() === date.getMonth());

                            const completedDays = daysInMonth.filter(d => {
                                const dateKey = getDateKey(d);
                                return goal.completedDays?.[dateKey];
                            }).length;

                            total += daysInMonth.length;
                            completed += completedDays;

                            const subject = extractSubject(goal.title);
                            if (subject) {
                                if (!subjectTasks[subject]) subjectTasks[subject] = { total: 0, completed: 0 };
                                subjectTasks[subject].total += daysInMonth.length;
                                subjectTasks[subject].completed += completedDays;
                            }

                            if (isStudyRelated(goal)) {
                                const hours = extractStudyHours(goal.title);
                                if (hours > 0) {
                                    studyHoursTotal += hours * daysInMonth.length;
                                    studyHoursCompleted += hours * completedDays;
                                    if (subject) {
                                        subjectHours[subject] = (subjectHours[subject] || 0) + (hours * completedDays);
                                    }
                                }
                            }
                        }
                    });
                }
            });

            // 3. Monthly Goals
            const monthGoals = allGoals.monthly[monthKey] || [];
            monthGoals.forEach((goal: any) => {
                if (goal.title) {
                    const completedDays = monthDays.filter(day => {
                        const dateKey = getDateKey(day);
                        return goal.completedDays?.[dateKey];
                    }).length;

                    total += monthDays.length;
                    completed += completedDays;

                    const subject = extractSubject(goal.title);
                    if (subject) {
                        if (!subjectTasks[subject]) subjectTasks[subject] = { total: 0, completed: 0 };
                        subjectTasks[subject].total += monthDays.length;
                        subjectTasks[subject].completed += completedDays;
                    }

                    if (isStudyRelated(goal)) {
                        const hours = extractStudyHours(goal.title);
                        if (hours > 0) {
                            studyHoursTotal += hours * monthDays.length;
                            studyHoursCompleted += hours * completedDays;
                            if (subject) {
                                subjectHours[subject] = (subjectHours[subject] || 0) + (hours * completedDays);
                            }
                        }
                    }
                }
            });
        }

        return { completed, total, studyHoursCompleted, studyHoursTotal, subjectHours, subjectTasks };
    };



    // ... helper functions ...

    const calculateStats = () => {
        // Use data from hooks
        const allGoals = {
            daily: dailyGoals,
            weekly: weeklyGoals,
            monthly: monthlyGoals
        };

        const today = new Date();
        const periodsToCheck = 4;
        const newTrendData: TrendDataPoint[] = [];

        // Calculate for current period (stats) and last 3 periods (trend)
        for (let i = 0; i < periodsToCheck; i++) {
            const date = new Date(today);
            let label = '';

            if (viewType === 'daily') {
                date.setDate(today.getDate() - i);
                label = date.toLocaleDateString('en-US', { weekday: 'short' });
            } else if (viewType === 'weekly') {
                date.setDate(today.getDate() - (i * 7));
                label = `Week -${i}`;
                if (i === 0) label = 'This Week';
            } else {
                date.setMonth(today.getMonth() - i);
                label = date.toLocaleDateString('en-US', { month: 'short' });
            }

            const periodStats = getStatsForPeriod(date, viewType, allGoals);

            if (i === 0) {
                setStats({
                    completed: periodStats.completed,
                    total: periodStats.total,
                    studyHoursCompleted: periodStats.studyHoursCompleted,
                    studyHoursTotal: periodStats.studyHoursTotal
                });
                setSubjectDistribution(periodStats.subjectHours);
                setSubjectTaskDistribution(periodStats.subjectTasks);
            }

            // Flatten subject stats for trend chart
            const flattened: any = {
                name: label,
                completed: periodStats.completed,
                total: periodStats.total,
                studyCompleted: periodStats.studyHoursCompleted,
                studyTotal: periodStats.studyHoursTotal,
            };

            // Add subject specific data keys like "Math_hours", "Math_tasks"
            Object.entries(periodStats.subjectHours).forEach(([subj, hours]) => {
                flattened[`${subj}_hours`] = hours;
            });
            Object.entries(periodStats.subjectTasks).forEach(([subj, data]) => {
                flattened[`${subj}_tasks`] = data.completed;
            });

            newTrendData.unshift(flattened); // Add to front to keep chronological order
        }

        setTrendData(newTrendData);
    };

    useEffect(() => {
        if (!dailyLoading && !weeklyLoading && !monthlyLoading && !subjectLoading) {
            calculateStats();
        }
        // Note: recognizeSubject is intentionally NOT in deps to avoid infinite loops
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewType, dailyGoals, weeklyGoals, monthlyGoals, dailyLoading, weeklyLoading, monthlyLoading, subjectLoading]);

    const goalCompletionData = [
        { name: 'Completed', value: stats.completed, color: '#27ae60' },
        { name: 'Pending', value: stats.total - stats.completed, color: '#e74c3c' }
    ];

    const studyHoursData = [
        { name: 'Completed', value: stats.studyHoursCompleted, color: '#3498db' },
        { name: 'Remaining', value: stats.studyHoursTotal - stats.studyHoursCompleted, color: '#95a5a6' }
    ];

    const subjectData = Object.entries(subjectDistribution).map(([subject, hours]) => ({
        name: subject,
        value: hours,
        color: getSubjectColor(subject)
    }));

    const subjectTaskData = Object.entries(subjectTaskDistribution).map(([subject, data]) => ({
        name: subject,
        value: data.completed,
        total: data.total,
        color: getSubjectColor(subject)
    }));

    // Get all unique subjects from the trend data for stacking
    const allSubjects = Array.from(new Set(trendData.flatMap(d => Object.keys(d).filter(k => k.includes('_hours') || k.includes('_tasks')).map(k => k.split('_')[0]))));

    // Create a subject to color mapping for consistency
    const subjectColorMap: { [key: string]: string } = {};
    allSubjects.forEach(subject => {
        subjectColorMap[subject] = getSubjectColor(subject);
    });

    const COLORS = {
        completed: '#27ae60',
        pending: '#e74c3c',
        studyCompleted: '#3498db',
        studyRemaining: '#95a5a6'
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Analytics</h1>
                <div className={styles.viewSelector}>
                    <button
                        className={`${styles.viewButton} ${viewType === 'daily' ? styles.active : ''}`}
                        onClick={() => setViewType('daily')}
                    >
                        Daily
                    </button>
                    <button
                        className={`${styles.viewButton} ${viewType === 'weekly' ? styles.active : ''}`}
                        onClick={() => setViewType('weekly')}
                    >
                        Weekly
                    </button>
                    <button
                        className={`${styles.viewButton} ${viewType === 'monthly' ? styles.active : ''}`}
                        onClick={() => setViewType('monthly')}
                    >
                        Monthly
                    </button>
                </div>
            </header>

            <div className={styles.chartsContainer}>
                {/* Goal Completion Section */}
                <div className={styles.chartCard}>
                    <h2 className={styles.chartTitle}>Goal Completion</h2>
                    <div className={styles.chartWrapper}>
                        {stats.total > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={goalCompletionData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, value }) => `${name}: ${value}`}
                                        outerRadius={55}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {goalCompletionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={styles.noData}>No goals for this period</div>
                        )}
                    </div>
                    <div className={styles.chartWrapper} style={{ marginTop: '2rem', height: '200px' }}>
                        <h3 className={styles.chartSubtitle}>Trend</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="completed" name="Completed" fill={COLORS.completed} />
                                <Bar dataKey="total" name="Total" fill={COLORS.pending} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Study Hours Section */}
                <div className={styles.chartCard}>
                    <h2 className={styles.chartTitle}>Study Hours</h2>
                    <div className={styles.chartWrapper}>
                        {stats.studyHoursTotal > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={studyHoursData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, value }) => `${name}: ${value.toFixed(1)}h`}
                                        outerRadius={55}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {studyHoursData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `${value.toFixed(1)} hours`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={styles.noData}>No study goals for this period</div>
                        )}
                    </div>
                    <div className={styles.chartWrapper} style={{ marginTop: '2rem', height: '200px' }}>
                        <h3 className={styles.chartSubtitle}>Trend</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="studyCompleted" name="Completed (h)" fill={COLORS.studyCompleted} />
                                <Bar dataKey="studyTotal" name="Total (h)" fill={COLORS.studyRemaining} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Subject-wise Study Time Section */}
                <div className={styles.chartCard}>
                    <h2 className={styles.chartTitle}>Subject-wise Study Time</h2>
                    <div className={styles.chartWrapper}>
                        {subjectData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={subjectData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, value }) => value > 0 ? `${name}: ${value.toFixed(1)}h` : ''}
                                        outerRadius={55}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {subjectData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `${value.toFixed(1)} hours`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={styles.noData}>No subject data for this period</div>
                        )}
                    </div>
                    <div className={styles.chartWrapper} style={{ marginTop: '2rem', height: '200px' }}>
                        <h3 className={styles.chartSubtitle}>Trend</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {allSubjects.map((subject, index) => (
                                    <Bar
                                        key={subject}
                                        dataKey={`${subject}_hours`}
                                        name={subject}
                                        stackId="a"
                                        fill={subjectColorMap[subject]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Subject-wise Task Completion Section */}
                <div className={styles.chartCard}>
                    <h2 className={styles.chartTitle}>Subject-wise Task Completion</h2>
                    <div className={styles.chartWrapper}>
                        {subjectTaskData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={subjectTaskData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                                        outerRadius={55}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {subjectTaskData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number, name: string, props: any) => [`${value} / ${props.payload.total} completed`, name]} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={styles.noData}>No subject tasks for this period</div>
                        )}
                    </div>
                    <div className={styles.chartWrapper} style={{ marginTop: '2rem', height: '200px' }}>
                        <h3 className={styles.chartSubtitle}>Trend</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {allSubjects.map((subject, index) => (
                                    <Bar
                                        key={subject}
                                        dataKey={`${subject}_tasks`}
                                        name={subject}
                                        stackId="a"
                                        fill={subjectColorMap[subject]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div >
    );
}
