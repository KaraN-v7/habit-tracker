# 🚀 Supabase Migration Guide

This guide will help you migrate your Habit Tracker from localStorage to Supabase for cross-device synchronization.

---

## 📋 Prerequisites

- ✅ Supabase account (already created)
- ✅ Supabase project (already set up)
- ✅ Google Authentication configured in Supabase

---

## 🎯 Phase 1: Database Setup

### Step 1: Access Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `lmjummjkdvrjcerteflb`
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Database Setup Script

1. Open the file `supabase-setup.sql` in this directory
2. **Copy ALL the content** from that file
3. **Paste it** into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Tables Were Created

1. In Supabase Dashboard, click **Table Editor** in the left sidebar
2. You should see these tables:
   - ✅ `daily_goals`
   - ✅ `weekly_goals`
   - ✅ `weekly_goal_completions`
   - ✅ `monthly_goals`
   - ✅ `monthly_goal_completions`
   - ✅ `subjects`
   - ✅ `chapters`
   - ✅ `gamification_stats`
   - ✅ `badges`
   - ✅ `user_preferences`

---

## 🎯 Phase 2: Code Migration

### What Will Happen:

I will create custom React hooks that:
- Replace all `localStorage` calls with Supabase queries
- Add real-time synchronization
- Handle authentication automatically
- Work seamlessly on localhost AND production

### Files That Will Be Created/Modified:

#### New Files (Hooks):
- `src/hooks/useDailyGoals.ts` - Manage daily tasks
- `src/hooks/useWeeklyGoals.ts` - Manage weekly goals
- `src/hooks/useMonthlyGoals.ts` - Manage monthly goals
- `src/hooks/useSyllabus.ts` - Manage subjects and chapters
- `src/hooks/useGamificationData.ts` - Manage badges and stats
- `src/hooks/useUserPreferences.ts` - Manage theme and settings

#### Modified Files:
- `src/app/page.tsx` - Daily page
- `src/app/weekly/page.tsx` - Weekly page
- `src/app/monthly/page.tsx` - Monthly page
- `src/app/syllabus/page.tsx` - Syllabus page
- `src/context/GamificationContext.tsx` - Gamification
- `src/context/ThemeContext.tsx` - Theme preferences

---

## 🎯 Phase 3: Testing

### After Migration:

1. **Login Required**: You'll need to be logged in to see/create data
2. **Data Persistence**: All data will be saved to Supabase
3. **Cross-Device Sync**: Login on another device to see the same data
4. **Real-Time Updates**: Changes sync automatically across devices

### Testing Checklist:

- [ ] Can create daily tasks
- [ ] Can create weekly goals
- [ ] Can create monthly goals
- [ ] Can create subjects and chapters
- [ ] Badges unlock correctly
- [ ] Theme preference persists
- [ ] Data syncs across browser tabs
- [ ] Data appears after refresh

---

## 🎯 Phase 4: Data Migration (Optional)

If you have existing data in localStorage that you want to keep:

1. I'll create a one-time migration script
2. You'll run it once while logged in
3. It will copy all your localStorage data to Supabase
4. After that, you can clear localStorage

---

## ⚠️ Important Notes

### During Development (localhost):
- You'll connect to Supabase cloud database
- Data created on localhost will be saved to Supabase
- You can see this data in Supabase Dashboard

### After Deployment (Vercel):
- Same Supabase database
- Same data as localhost
- Everything syncs automatically

### Security:
- Row Level Security (RLS) is enabled
- Users can only see their own data
- Authentication is required for all operations

---

## 🆘 Troubleshooting

### "No data showing after migration"
- Make sure you're logged in with Google
- Check Supabase Dashboard → Table Editor to see if data exists
- Check browser console for errors

### "Changes not syncing"
- Check your internet connection
- Verify Supabase project is active
- Check browser console for authentication errors

### "Can't create new tasks"
- Verify you're logged in
- Check Supabase Dashboard → Authentication → Users
- Ensure RLS policies are enabled

---

## 📞 Next Steps

Once you've completed **Phase 1** (Database Setup):
1. Let me know it's done
2. I'll proceed with **Phase 2** (Code Migration)
3. We'll test everything together
4. Then deploy to Vercel!

---

## 🎉 Benefits After Migration

✅ **Cross-device sync** - Access your data anywhere  
✅ **Real-time updates** - Changes appear instantly  
✅ **Data persistence** - Never lose your data  
✅ **Secure** - Your data is protected  
✅ **Scalable** - Works for 1 user or 1000 users  
✅ **Production-ready** - Deploy to Vercel immediately  

---

**Ready to begin? Start with Phase 1! 🚀**
