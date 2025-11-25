# 🚀 Quick Setup - 3 Easy Steps

## Current Status
You're seeing this error because the subject recognition tables don't exist in your Supabase database yet:
```
Error loading subject data: {}
```

**Don't worry!** This is normal. Follow these 3 steps to fix it:

---

## Step 1: Run Database Fix (30 seconds)

1. Open: https://supabase.com/dashboard
2. Select your project: **lmjummjkdvrjcerteflb**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy ALL the content from: `fix-database-schema.sql`
6. Paste into the editor
7. Click **RUN** (or press Ctrl+Enter)
8. ✅ Wait for "Tables fixed successfully!"

---

## Step 2: Run Subject Recognition Setup (1 minute)

1. Still in SQL Editor
2. Click **New Query** again
3. Copy ALL the content from: `subject-recognition-setup.sql`
4. Paste into the editor
5. Click **RUN** (or press Ctrl+Enter)
6. ✅ Wait for "Subject Recognition System created successfully!"

---

## Step 3: Verify & Test (30 seconds)

1. In Supabase SQL Editor, run this quick test:
   ```sql
   -- Test 1: Check subjects loaded
   SELECT COUNT(*) FROM subject_mappings;
   -- Should show: 15

   -- Test 2: Check variations loaded
   SELECT COUNT(*) FROM subject_variations;
   -- Should show: 100+

   -- Test 3: Test "sst" recognition
   SELECT * FROM recognize_subject('study sst for 2 hours');
   -- Should show: Social Studies
   ```

2. Go back to your app (refresh the page)
3. Check the console - you should see:
   ```
   ✅ Loaded 15 subjects with 100+ variations
   ```

4. **Test it!**
   - Go to Daily section
   - Add goal: "study sst for 2 hours"
   - Go to Analytics
   - You should see it under "Social Studies"! 🎉

---

## 🆘 Troubleshooting

### Error in SQL Editor?
- Make sure you're in the correct project
- Try running each script separately
- Check for typos when copying

### Still seeing errors in console?
- Hard refresh your app (Ctrl+Shift+R)
- Check if both SQL scripts ran successfully
- Run the verification queries above

### Tables already exist?
If you see "already exists" errors, it's okay! The scripts use `IF NOT EXISTS` so they won't break anything.

---

## 📊 What You'll Get

After setup:
- ✅ "sst" → Recognized as "Social Studies"
- ✅ "phy" → Recognized as "Physics"
- ✅ "chem" → Recognized as "Chemistry"
- ✅ All typos handled automatically
- ✅ Clean analytics with grouped subjects
- ✅ 15 Class 10 CBSE subjects ready

---

## 🎯 Total Time: ~2 minutes

That's it! Once you run both SQL scripts, the error will disappear and subject recognition will work perfectly.

**Questions?** Check `SUBJECT_RECOGNITION_SETUP.md` for detailed docs.

---

## Quick Reference

| File | What it does |
|------|--------------|
| `fix-database-schema.sql` | Fixes corrupted tables |
| `subject-recognition-setup.sql` | Adds all subjects & variations |
| `useful-subject-queries.sql` | Helpful queries for later |

**Ready?** Go to Supabase → SQL Editor → Run the scripts! 🚀
