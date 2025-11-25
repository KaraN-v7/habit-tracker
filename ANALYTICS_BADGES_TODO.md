# 🔄 **Analytics & Badges Migration - TODO**

## ❌ **Current Status: NOT MIGRATED**

You're absolutely right! I created the `useGamificationData` hook but never updated these pages to use it:

### **Still Using localStorage:**
1. **Badges Page** (`src/app/badges/page.tsx`)
   - Using: `useGamification()` from `GamificationContext` 
   - Should use: `useGamificationData()` hook
   - Data source: localStorage ❌

2. **Analytics Page** (`src/app/analytics/page.tsx`)
   - Using: `localStorage.getItem('dailyGoals')`, `weeklyGoals`, `monthlyGoals`
   - Should use: `useDailyGoals()`, `useWeeklyGoals()`, `useMonthlyGoals()` hooks
   - Data source: localStorage ❌

---

## ✅ **What Needs to Be Done:**

### 1. **Update Badges Page**
```typescript
// Current (WRONG):
import { useGamification } from '@/context/GamificationContext';
const { badges, stats } = useGamification();

// Should be (CORRECT):
import { useGamificationData } from '@/hooks/useGamificationData';
const { badges, stats, loading, user } = useGamificationData();
```

### 2. **Update Analytics Page**
```typescript
// Current (WRONG):
const allGoals = {
    daily: JSON.parse(localStorage.getItem('dailyGoals') || '{}'),
    weekly: JSON.parse(localStorage.getItem('weeklyGoals') || '{}'),
    monthly: JSON.parse(localStorage.getItem('monthlyGoals') || '{}')
};

// Should be (CORRECT):
import { useDailyGoals } from '@/hooks/useDailyGoals';
import { useWeeklyGoals } from '@/hooks/useWeeklyGoals';
import { useMonthlyGoals } from '@/hooks/useMonthlyGoals';

const { goals: dailyGoals } = useDailyGoals();
const { goals: weeklyGoals } = useWeeklyGoals();
const { goals: monthlyGoals } = useMonthlyGoals();

const allGoals = {
    daily: dailyGoals,
    weekly: weeklyGoals,
    monthly: monthlyGoals
};
```

---

## 📋 **Migration Tasks:**

- [ ] Update Badges page to use `useGamificationData` hook
- [ ] Update Analytics page to use goals hooks instead of localStorage
- [ ] Test Badges page with real Supabase data
- [ ] Test Analytics calculations with real Supabase data
- [ ] Verify cross-device sync for badges
- [ ] Remove/deprecate old `GamificationContext` after migration

---

## ⚠️ **Why This Matters:**

**Current Situation:**
- Your Daily, Weekly, Monthly goals are in Supabase ✅
- Your Analytics and Badges are still reading from old localStorage ❌
- This means Analytics shows outdated/incorrect data
- Badges won't unlock properly

**After Migration:**
- All data will be consistent
- Analytics will show real-time accurate stats
- Badges will unlock based on actual progress
- Everything syncs across devices

---

**Ready to migrate these pages?** I can update them now!

**Last Updated: 2025-11-24 22:56 IST**
**Priority: HIGH** 🔴
