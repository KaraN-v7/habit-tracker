'use client';

import React, { useState } from 'react';
import styles from './page.module.css';
import {
    Plus,
    Trash2,
    ArrowRightCircle,
    CheckCircle2,
    Circle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useSyllabus } from '@/hooks/useSyllabus';
import { useDailyGoals } from '@/hooks/useDailyGoals';

const COLORS = ['#10b981', '#e2e8f0']; // Completed (Green), Remaining (Gray)

export default function SyllabusPage() {
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newChapterNames, setNewChapterNames] = useState<{ [subjectId: string]: string }>({});

    const { subjects, loading, saveSubjects, updateChapterCompletion, user } = useSyllabus();
    const { saveGoals: saveDailyGoals, addGoal, goals: dailyGoals } = useDailyGoals();

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const getDateKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const addSubject = async () => {
        if (!newSubjectName.trim()) return;
        const newSubject = {
            id: generateId(),
            name: newSubjectName,
            color: '#10b981',
            chapters: []
        };
        await saveSubjects([...subjects, newSubject]);
        setNewSubjectName('');
    };

    const deleteSubject = async (id: string) => {
        if (confirm('Are you sure you want to delete this subject?')) {
            await saveSubjects(subjects.filter(s => s.id !== id));
        }
    };

    const addChapter = async (subjectId: string) => {
        const name = newChapterNames[subjectId];
        if (!name?.trim()) return;

        const newChapter = {
            id: generateId(),
            name: name,
            completed: false
        };

        const updatedSubjects = subjects.map(s => {
            if (s.id === subjectId) {
                return { ...s, chapters: [...s.chapters, newChapter] };
            }
            return s;
        });

        await saveSubjects(updatedSubjects);
        setNewChapterNames({ ...newChapterNames, [subjectId]: '' });
    };

    const deleteChapter = async (subjectId: string, chapterId: string) => {
        const updatedSubjects = subjects.map(s => {
            if (s.id === subjectId) {
                return { ...s, chapters: s.chapters.filter(c => c.id !== chapterId) };
            }
            return s;
        });
        await saveSubjects(updatedSubjects);
    };
    const toggleChapterCompletion = async (subjectId: string, chapterId: string) => {
        const subject = subjects.find(s => s.id === subjectId);
        const chapter = subject?.chapters.find(c => c.id === chapterId);
        if (!chapter) return;

        await updateChapterCompletion(subjectId, chapterId, !chapter.completed);
    };

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const pushToToday = async (subjectId: string, chapterId: string) => {
        const subject = subjects.find(s => s.id === subjectId);
        const chapter = subject?.chapters.find(c => c.id === chapterId);
        if (!subject || !chapter) return;

        const todayKey = getDateKey(new Date());
        const todayGoals = dailyGoals[todayKey] || [];

        // Check for duplicates
        const isDuplicate = todayGoals.some(goal => goal.parentId === chapterId);
        if (isDuplicate) {
            showToast('This chapter is already in your daily goals', 'error');
            return;
        }

        const newBlock = {
            id: generateId(),
            type: 'todo' as const,
            content: `${chapter.name} (${subject.name})`,
            completed: false,
            source: 'daily' as const,
            parentId: chapterId // Link to chapter for sync
        };

        await addGoal(todayKey, newBlock);

        showToast('Chapter added to daily goals');

        // Reset chapter completion when pushed
        await updateChapterCompletion(subjectId, chapterId, false);
    };

    const getTotalStats = () => {
        let total = 0;
        let completed = 0;
        subjects.forEach(s => {
            total += s.chapters.length;
            completed += s.chapters.filter(c => c.completed).length;
        });
        return { total, completed, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) };
    };

    const getSubjectStats = (subject: any) => {
        const total = subject.chapters.length;
        const completed = subject.chapters.filter((c: any) => c.completed).length;
        return { total, completed, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) };
    };

    const totalStats = getTotalStats();
    const pieData = [
        { name: 'Completed', value: totalStats.completed },
        { name: 'Remaining', value: totalStats.total - totalStats.completed }
    ];

    // Show loading state
    if (loading) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    Loading...
                </div>
            </div>
        );
    }

    // Show login prompt if not authenticated
    if (!user) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <h2>Please log in to view your syllabus</h2>
                    <p>Your data will be synced across all your devices once you log in.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Syllabus Tracker</h1>
                    <p className={styles.subtitle}>Manage your subjects and track your progress</p>
                </div>
            </header>

            {/* Overall Progress */}
            <section className={styles.overview}>
                <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className={styles.chartLabel}>
                        <div className={styles.chartLabelValue}>{totalStats.percentage}%</div>
                        <div className={styles.chartLabelText}>Done</div>
                    </div>
                </div>

                <div className={styles.stats}>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{totalStats.completed}</span>
                        <span className={styles.statLabel}>Chapters Completed</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{totalStats.total}</span>
                        <span className={styles.statLabel}>Total Chapters</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{subjects.length}</span>
                        <span className={styles.statLabel}>Subjects</span>
                    </div>
                </div>
            </section>

            {/* Subjects Grid */}
            <div className={styles.grid}>
                {subjects.map(subject => {
                    const stats = getSubjectStats(subject);
                    const subjectPieData = [
                        { name: 'Completed', value: stats.completed },
                        { name: 'Remaining', value: stats.total - stats.completed }
                    ];

                    return (
                        <div key={subject.id} className={styles.subjectCard}>
                            <div className={styles.subjectHeader}>
                                <div>
                                    <h2 className={styles.subjectTitle}>{subject.name}</h2>
                                    <p style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-secondary)',
                                        margin: '0.25rem 0 0 0',
                                        fontWeight: 500
                                    }}>
                                        {stats.total} {stats.total === 1 ? 'chapter' : 'chapters'}
                                    </p>
                                </div>
                                <div className={styles.subjectChart} style={{ position: 'relative' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={subjectPieData}
                                                innerRadius={12}
                                                outerRadius={18}
                                                paddingAngle={0}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {subjectPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        fontSize: '9px',
                                        fontWeight: 'bold',
                                        color: 'var(--text-primary)',
                                        pointerEvents: 'none'
                                    }}>
                                        {stats.percentage}%
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteSubject(subject.id)}
                                    className={styles.pushButton}
                                    title="Delete Subject"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className={styles.chapterList}>
                                {subject.chapters.map(chapter => (
                                    <div key={chapter.id} className={`${styles.chapterItem} ${chapter.completed ? styles.completed : ''}`}>
                                        <button
                                            className={styles.statusIcon}
                                            onClick={() => toggleChapterCompletion(subject.id, chapter.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                        >
                                            {chapter.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                        </button>
                                        <span className={styles.chapterName}>{chapter.name}</span>
                                        <button
                                            onClick={() => pushToToday(subject.id, chapter.id)}
                                            className={styles.pushButton}
                                            title="Push to Today's Goals"
                                        >
                                            <ArrowRightCircle size={18} />
                                        </button>
                                        <button
                                            onClick={() => deleteChapter(subject.id, chapter.id)}
                                            className={styles.pushButton}
                                            style={{ opacity: 0.5 }}
                                            title="Delete Chapter"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.addChapter}>
                                <input
                                    type="text"
                                    placeholder="New chapter name..."
                                    className={styles.input}
                                    value={newChapterNames[subject.id] || ''}
                                    onChange={(e) => setNewChapterNames({ ...newChapterNames, [subject.id]: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && addChapter(subject.id)}
                                />
                                <button onClick={() => addChapter(subject.id)} className={styles.addButton}>
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Add Subject Card */}
                <div className={styles.subjectCard} style={{ borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}>
                    <div className={styles.addSubjectCard} onClick={() => document.getElementById('newSubjectInput')?.focus()}>
                        <div style={{ width: '100%', padding: '1rem' }}>
                            <input
                                id="newSubjectInput"
                                type="text"
                                placeholder="Enter subject name..."
                                className={styles.input}
                                style={{ textAlign: 'center', marginBottom: '1rem' }}
                                value={newSubjectName}
                                onChange={(e) => setNewSubjectName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addSubject()}
                            />
                            <button
                                onClick={addSubject}
                                className={styles.addButton}
                                style={{ width: '100%' }}
                            >
                                <Plus size={18} style={{ marginRight: '0.5rem' }} />
                                Add New Subject
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: toast.type === 'success' ? '#10b981' : '#ef4444',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '9999px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    zIndex: 50,
                    fontWeight: 500,
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}
