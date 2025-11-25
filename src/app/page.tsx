'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './page.module.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDailyGoals, Block, BlockType } from '@/hooks/useDailyGoals';
import { useWeeklyGoals } from '@/hooks/useWeeklyGoals';
import { useMonthlyGoals } from '@/hooks/useMonthlyGoals';
export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [inheritedGoals, setInheritedGoals] = useState<Block[]>([]);

  const { goals, loading: dailyLoading, saveGoals, updateGoalCompletion, updateBlockContent, user } = useDailyGoals();
  const { goals: weeklyGoals, loading: weeklyLoading, updateGoalCompletion: updateWeeklyCompletion } = useWeeklyGoals();
  const { goals: monthlyGoals, loading: monthlyLoading, updateGoalCompletion: updateMonthlyCompletion } = useMonthlyGoals();

  // Focus management
  const inputRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});

  const getDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const dateKey = getDateKey(currentDate);

  // Load inherited goals from weekly and monthly
  useEffect(() => {
    if (weeklyLoading || monthlyLoading) return;

    const inherited: Block[] = [];

    // Get weekly goals
    const weekStart = getWeekStart(currentDate);
    const weekKey = getDateKey(weekStart);
    const weekGoals = weeklyGoals[weekKey] || [];

    weekGoals.forEach((goal) => {
      if (goal.title) {
        inherited.push({
          id: `weekly-${goal.id}`,
          type: 'todo',
          content: goal.title,
          completed: goal.completedDays?.[dateKey] || false,
          source: 'weekly',
          parentId: goal.id
        });
      }
    });

    // Get monthly goals
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    const monthGoals = monthlyGoals[monthKey] || [];

    monthGoals.forEach((goal) => {
      if (goal.title) {
        inherited.push({
          id: `monthly-${goal.id}`,
          type: 'todo',
          content: goal.title,
          completed: goal.completedDays?.[dateKey] || false,
          source: 'monthly',
          parentId: goal.id
        });
      }
    });

    setInheritedGoals(inherited);
  }, [currentDate, weeklyGoals, monthlyGoals, dateKey, weeklyLoading, monthlyLoading]);

  const dailyOnlyGoals = goals[dateKey] || [];
  const currentBlocks = [...inheritedGoals, ...dailyOnlyGoals];

  const updateGoals = async (newBlocks: Block[]) => {
    // Only save daily-created goals
    const dailyBlocks = newBlocks.filter(b => !b.source || b.source === 'daily');
    await saveGoals(dateKey, dailyBlocks);
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addBlock = async (afterId: string | null = null, type: BlockType = 'todo') => {
    const newBlock: Block = {
      id: generateId(),
      type: type,
      content: '',
      completed: false,
      source: 'daily'
    };

    let newBlocks = [...dailyOnlyGoals];
    if (afterId) {
      const index = newBlocks.findIndex(b => b.id === afterId);
      if (index >= 0) {
        newBlocks.splice(index + 1, 0, newBlock);
      } else {
        newBlocks.push(newBlock);
      }
    } else {
      newBlocks.push(newBlock);
    }

    await updateGoals([...inheritedGoals, ...newBlocks]);

    // Focus the new block after state update
    setTimeout(() => {
      const newTextarea = inputRefs.current[newBlock.id];
      if (newTextarea) {
        newTextarea.focus();
      }
    }, 50);
  };

  const updateBlock = async (id: string, updates: Partial<Block>) => {
    const block = currentBlocks.find(b => b.id === id);

    if (block?.source === 'weekly') {
      // Update weekly goal completion
      if ('completed' in updates && block.parentId) {
        const weekStart = getWeekStart(currentDate);
        const weekKey = getDateKey(weekStart);
        await updateWeeklyCompletion(weekKey, block.parentId, dateKey, updates.completed!);

        // Update local inherited goals
        setInheritedGoals(prev =>
          prev.map(g => g.id === id ? { ...g, completed: updates.completed! } : g)
        );
      }
    } else if (block?.source === 'monthly') {
      // Update monthly goal completion
      if ('completed' in updates && block.parentId) {
        const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
        await updateMonthlyCompletion(monthKey, block.parentId, dateKey, updates.completed!);

        // Update local inherited goals
        setInheritedGoals(prev =>
          prev.map(g => g.id === id ? { ...g, completed: updates.completed! } : g)
        );
      }
    } else {
      // Update daily goal
      if ('completed' in updates) {
        await updateGoalCompletion(dateKey, id, updates.completed!);

        if (updates.completed) {
          // checkAchievements removed
        }
      } else {
        // Update content or type
        await updateBlockContent(dateKey, id, updates);
      }
    }
  };

  const deleteBlock = async (id: string) => {
    const block = currentBlocks.find(b => b.id === id);
    if (block?.source === 'weekly' || block?.source === 'monthly') {
      // Can't delete inherited goals from daily view
      return;
    }

    const index = dailyOnlyGoals.findIndex(b => b.id === id);
    if (index > 0) {
      const prevTextarea = inputRefs.current[dailyOnlyGoals[index - 1].id];
      if (prevTextarea) {
        prevTextarea.focus();
        // Move cursor to the end of the text
        const length = prevTextarea.value.length;
        prevTextarea.setSelectionRange(length, length);
      }
    }
    const newBlocks = dailyOnlyGoals.filter(b => b.id !== id);
    await updateGoals([...inheritedGoals, ...newBlocks]);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    const block = currentBlocks.find(b => b.id === id);
    if (block?.source === 'weekly' || block?.source === 'monthly') {
      // Don't allow enter/backspace on inherited goals
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addBlock(id);
    }
    if (e.key === 'Backspace' && currentBlocks.find(b => b.id === id)?.content === '') {
      e.preventDefault();
      deleteBlock(id);
    }
  };

  const toggleType = (id: string) => {
    const block = currentBlocks.find(b => b.id === id);
    if (block?.source === 'weekly' || block?.source === 'monthly') {
      return; // Can't change type of inherited goals
    }
    if (block) {
      updateBlock(id, { type: block.type === 'todo' ? 'text' : 'todo' });
    }
  };

  const adjustHeight = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const isToday = () => {
    const today = new Date();
    return currentDate.getDate() === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();
  };

  // Show loading state
  if (dailyLoading || weeklyLoading || monthlyLoading) {
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
          <h2>Please log in to view your daily goals</h2>
          <p>Your data will be synced across all your devices once you log in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.dateNavigation}>
          <button onClick={() => changeDate(-1)} className={styles.navButton}>
            <ChevronLeft size={24} />
          </button>
          <h1 className={styles.dateTitle}>
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h1>
          <button
            onClick={() => !isToday() && changeDate(1)}
            className={styles.navButton}
            style={{ opacity: isToday() ? 0 : 1, cursor: isToday() ? 'default' : 'pointer' }}
            disabled={isToday()}
          >
            <ChevronRight size={24} />
          </button>
        </div>
        <div className={styles.subHeader}>
          <span>Daily Goals</span>
        </div>
      </header>

      <div className={styles.editor}>
        {currentBlocks.length === 0 && (
          <div className={styles.emptyState} onClick={() => addBlock()}>
            Click here to add your first goal for today...
          </div>
        )}
        {currentBlocks.map((block) => (
          <div key={block.id} className={`${styles.block} ${block.completed ? styles.completed : ''}`}>
            {(!block.source || block.source === 'daily') && (
              <div
                className={styles.blockControls}
                onClick={() => toggleType(block.id)}
                title="Click to toggle between Task and Note"
              >
                ⋮⋮
              </div>
            )}

            {block.type === 'todo' && (
              <div
                className={`${styles.checkbox} ${block.completed ? styles.checked : ''}`}
                onClick={() => updateBlock(block.id, { completed: !block.completed })}
              >
                {block.completed && <span className={styles.checkIcon}>✓</span>}
              </div>
            )}

            <textarea
              ref={el => { inputRefs.current[block.id] = el; }}
              className={styles.contentInput}
              value={block.content}
              onChange={(e) => {
                if (!block.source || block.source === 'daily') {
                  updateBlock(block.id, { content: e.target.value });
                  adjustHeight(e.target);
                }
              }}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              placeholder={block.type === 'todo' ? "To-do" : "Type something..."}
              rows={1}
              onInput={(e) => adjustHeight(e.currentTarget)}
              readOnly={block.source === 'weekly' || block.source === 'monthly'}
              style={{
                cursor: (block.source === 'weekly' || block.source === 'monthly') ? 'default' : 'text',
                flex: 1
              }}
            />

            {block.source === 'monthly' && (
              <span className={styles.sourceLabel} style={{ color: '#f2994a', borderColor: '#f2994a' }}>monthly</span>
            )}
            {block.source === 'weekly' && (
              <span className={styles.sourceLabel} style={{ color: '#9b59b6', borderColor: '#9b59b6' }}>weekly</span>
            )}
          </div>
        ))}
      </div>

      {(currentBlocks.length > 0 || dailyOnlyGoals.length > 0) && (
        <div
          className={styles.addBlockArea}
          onClick={() => addBlock(dailyOnlyGoals.length > 0 ? dailyOnlyGoals[dailyOnlyGoals.length - 1].id : null)}
        >
          + Click to add a block
        </div>
      )}
    </div>
  );
}
