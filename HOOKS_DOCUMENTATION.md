# 🎣 Supabase Hooks Documentation

## Overview

These custom React hooks replace localStorage with Supabase for cloud-based data storage and real-time synchronization.

---

## 📦 Available Hooks

### 1. `useDailyGoals()`

Manages daily tasks and goals.

**Returns:**
```typescript
{
  goals: DailyGoals;              // All daily goals organized by date
  loading: boolean;                // Loading state
  user: User | null;               // Current authenticated user
  saveGoals: (dateKey, blocks) => Promise<void>;
  updateGoalCompletion: (dateKey, blockId, completed) => Promise<void>;
  refreshGoals: () => Promise<void>;
}
```

**Usage:**
```typescript
const { goals, loading, saveGoals, updateGoalCompletion } = useDailyGoals();

// Save goals for a specific date
await saveGoals('2025-11-24', blocks);

// Update completion status
await updateGoalCompletion('2025-11-24', 'block-id', true);
```

---

### 2. `useWeeklyGoals()`

Manages weekly goals with daily completion tracking.

**Returns:**
```typescript
{
  goals: WeeklyGoalsData;          // Weekly goals organized by week
  loading: boolean;
  user: User | null;
  saveGoals: (weekKey, goals) => Promise<void>;
  updateGoalCompletion: (weekKey, goalId, date, completed) => Promise<void>;
  refreshGoals: () => Promise<void>;
}
```

**Usage:**
```typescript
const { goals, saveGoals, updateGoalCompletion } = useWeeklyGoals();

// Save weekly goals
await saveGoals('2025-11-18', weeklyGoals);

// Update completion for a specific day
await updateGoalCompletion('2025-11-18', 'goal-id', '2025-11-24', true);
```

---

### 3. `useMonthlyGoals()`

Manages monthly goals with daily completion tracking.

**Returns:**
```typescript
{
  goals: MonthlyGoalsData;         // Monthly goals organized by month
  loading: boolean;
  user: User | null;
  saveGoals: (monthKey, goals) => Promise<void>;
  updateGoalCompletion: (monthKey, goalId, date, completed) => Promise<void>;
  refreshGoals: () => Promise<void>;
}
```

**Usage:**
```typescript
const { goals, saveGoals, updateGoalCompletion } = useMonthlyGoals();

// Save monthly goals (monthKey format: "2025-10")
await saveGoals('2025-10', monthlyGoals);

// Update completion for a specific day
await updateGoalCompletion('2025-10', 'goal-id', '2025-11-24', true);
```

---

### 4. `useSyllabus()`

Manages subjects and chapters for syllabus tracking.

**Returns:**
```typescript
{
  subjects: Subject[];             // All subjects with chapters
  loading: boolean;
  user: User | null;
  saveSubjects: (subjects) => Promise<void>;
  updateChapterCompletion: (subjectId, chapterId, completed) => Promise<void>;
  refreshSyllabus: () => Promise<void>;
}
```

**Usage:**
```typescript
const { subjects, saveSubjects, updateChapterCompletion } = useSyllabus();

// Save all subjects
await saveSubjects(updatedSubjects);

// Mark chapter as complete
await updateChapterCompletion('subject-id', 'chapter-id', true);
```

---

### 5. `useGamificationData()`

Manages badges and statistics for gamification.

**Returns:**
```typescript
{
  stats: GamificationStats;        // User stats (streaks, tasks, etc.)
  badges: { [badgeId: string]: Badge };
  loading: boolean;
  user: User | null;
  updateStats: (stats) => Promise<void>;
  updateBadge: (badgeId, updates) => Promise<void>;
  unlockBadge: (badgeId) => Promise<void>;
  refreshGamificationData: () => Promise<void>;
}
```

**Usage:**
```typescript
const { stats, badges, updateStats, unlockBadge } = useGamificationData();

// Update stats
await updateStats({ tasksCompleted: 10, currentStreak: 5 });

// Unlock a badge
await unlockBadge('first-task');
```

---

### 6. `useUserPreferences()`

Manages user preferences like theme.

**Returns:**
```typescript
{
  theme: Theme;                    // 'light' | 'dark'
  loading: boolean;
  user: User | null;
  updateTheme: (theme) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}
```

**Usage:**
```typescript
const { theme, updateTheme } = useUserPreferences();

// Change theme
await updateTheme('dark');
```

---

## 🔄 Real-Time Synchronization

All hooks automatically subscribe to real-time changes from Supabase. When data changes:

1. **Same Device**: Updates immediately
2. **Different Devices**: Updates within ~100ms
3. **Different Browsers**: Updates automatically
4. **After Refresh**: Data persists

---

## 🔐 Authentication

All hooks automatically:
- ✅ Check if user is authenticated
- ✅ Filter data by user ID
- ✅ Handle auth state changes
- ✅ Provide `user` object in return value

**Check if user is logged in:**
```typescript
const { user } = useDailyGoals();

if (!user) {
  // Show login screen
}
```

---

## 📊 Loading States

All hooks provide a `loading` state:

```typescript
const { loading, goals } = useDailyGoals();

if (loading) {
  return <div>Loading...</div>;
}

// Render data
```

---

## 🔄 Manual Refresh

All hooks provide a refresh function:

```typescript
const { refreshGoals } = useDailyGoals();

// Manually refresh data
await refreshGoals();
```

---

## 🎯 Migration from localStorage

### Before (localStorage):
```typescript
// Load
const saved = localStorage.getItem('dailyGoals');
const goals = JSON.parse(saved);

// Save
localStorage.setItem('dailyGoals', JSON.stringify(goals));
```

### After (Supabase):
```typescript
// Load (automatic)
const { goals } = useDailyGoals();

// Save
await saveGoals(dateKey, blocks);
```

---

## 🚨 Error Handling

All hooks handle errors internally and log them to console. For production, you may want to add custom error handling:

```typescript
const { saveGoals } = useDailyGoals();

try {
  await saveGoals(dateKey, blocks);
} catch (error) {
  // Handle error (show toast, etc.)
}
```

---

## 🎨 Best Practices

### 1. **Use Loading States**
```typescript
const { loading, goals } = useDailyGoals();

if (loading) return <Spinner />;
```

### 2. **Check Authentication**
```typescript
const { user } = useDailyGoals();

if (!user) return <LoginPrompt />;
```

### 3. **Debounce Frequent Updates**
```typescript
import { debounce } from 'lodash';

const debouncedSave = debounce(saveGoals, 500);
```

### 4. **Optimistic Updates**
```typescript
// Update UI immediately
setLocalGoals(newGoals);

// Then sync to database
await saveGoals(dateKey, newGoals);
```

---

## 🔧 Troubleshooting

### Data not loading?
- Check if user is authenticated
- Check browser console for errors
- Verify Supabase connection in `src/lib/supabase.ts`

### Real-time not working?
- Check Supabase project status
- Verify real-time is enabled in Supabase dashboard
- Check browser console for WebSocket errors

### Permission errors?
- Verify Row Level Security policies are enabled
- Check user is authenticated
- Verify user ID matches in database

---

## 📚 Next Steps

1. ✅ Hooks created
2. ⏳ Update components to use hooks
3. ⏳ Test functionality
4. ⏳ Deploy to production

---

**All hooks are ready to use! Let's update your components next.** 🚀
