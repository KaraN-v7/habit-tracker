# Subject Recognition System - Setup Instructions

## Overview
This system enables intelligent subject recognition from text using a database of subjects and their variations/typos. It's especially useful for Class 10 CBSE students where subjects like "SST" should automatically recognize as "Social Studies".

## Features
✅ Recognizes all Class 10 CBSE subjects
✅ Handles common typos and abbreviations (e.g., "sst" → "Social Studies", "phy" → "Physics")
✅ Database-driven (easy to extend with new subjects/variations)
✅ Integrated with Analytics for accurate subject tracking

## Setup Instructions

### Step 1: Run the SQL Setup in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to the **SQL Editor** (in the left sidebar)
4. Click **"New Query"**
5. Copy the entire contents of `subject-recognition-setup.sql`
6. Paste it into the SQL Editor
7. Click **"Run"** to execute

This will:
- Create the `subject_mappings` table (stores canonical subject names and colors)
- Create the `subject_variations` table (stores all typos/abbreviations)
- Seed the database with all Class 10 CBSE subjects
- Add common variations and typos
- Create a helper function `recognize_subject()` for SQL-based recognition

### Step 2: Verify the Setup

After running the SQL, verify it worked:

```sql
-- Check if subjects were added
SELECT * FROM subject_mappings;

-- Check if variations were added
SELECT * FROM subject_variations LIMIT 20;

-- Test the recognition function
SELECT * FROM recognize_subject('study sst for 2 hours');
-- Should return: Social Studies

SELECT * FROM recognize_subject('phy chapter 1');
-- Should return: Physics
```

### Step 3: Using in Your Application

The subject recognition is now automatically integrated into:
- ✅ **Analytics Page**: All subjects are recognized and grouped properly
- ✅ **Daily Goals**: Subjects typed in goals are recognized
- ✅ **Weekly Goals**: Subject tracking across the week
- ✅ **Monthly Goals**: Subject tracking across the month

## Supported Subjects (Class 10 CBSE)

| Subject | Common Variations |
|---------|-------------------|
| **Mathematics** | math, maths, mathmatics |
| **Science** | sci, scien |
| **Physics** | phy, phys, fysics |
| **Chemistry** | chem, chemist, chemisrty |
| **Biology** | bio, biol, biolagy |
| **Social Studies** | **sst**, social, s.st, s.s.t |
| **History** | hist, histroy, histry |
| **Geography** | geo, geog, geograpy |
| **Civics** | civic, political science, pol sci |
| **Economics** | eco, econ, economy |
| **English** | eng, englsh, enlish |
| **Hindi** | hnd, hin, hindy |
| **Sanskrit** | sans, sansk, sanskrt |
| **Computer Science** | computer, comp, CS, IT, coding, programming |
| **Physical Education** | PE, p.e, phy ed, sports |

## How It Works

1. **User types a goal**: e.g., "study sst for 2 hours"
2. **System recognizes the subject**: "sst" → "Social Studies"
3. **Analytics tracks it properly**: All SST-related tasks are grouped under "Social Studies"
4. **Charts and stats**: Display unified data for the subject

## Adding New Variations

If you want to add more variations (e.g., regional names), you can either:

**Option A: Via SQL (in Supabase SQL Editor)**
```sql
-- Add a new variation for Social Studies
INSERT INTO subject_variations (subject_id, variation)
SELECT id, 'social sci'
FROM subject_mappings
WHERE canonical_name = 'Social Studies';
```

**Option B: Via the Application (Future Feature)**
We can add a UI in the settings page to manage subject variations.

## Troubleshooting

### Subject not recognized?
1. Check if the variation exists in the database:
   ```sql
   SELECT * FROM subject_variations WHERE LOWER(variation) = 'your_text';
   ```
2. If not, add it using Option A above

### Colors not showing?
Each subject has a predefined color in `subject_mappings`. You can change them:
```sql
UPDATE subject_mappings 
SET color = '#your_hex_color' 
WHERE canonical_name = 'Subject Name';
```

## Technical Details

- **Database Tables**: `subject_mappings`, `subject_variations`
- **React Hook**: `useSubjectRecognition` (`src/hooks/useSubjectRecognition.ts`)
- **Usage**: Analytics page automatically uses this hook
- **Matching Logic**: Prefers longer matches (e.g., "computer science" over "computer")

## Benefits

✨ **Accuracy**: No more manual subject tagging
✨ **Flexibility**: Handles typos and abbreviations automatically
✨ **Extensibility**: Easy to add new subjects or variations
✨ **User-Friendly**: Students can type naturally ("sst" instead of "Social Studies")

## Next Steps

- ✅ System is ready to use!
- Try typing goals with subjects like "sst", "phy", "chem"
- Check the Analytics page to see subjects properly categorized
- See your study hours and task completion grouped by subject

---

**Note**: This works for both your goals AND your brother's Class 10 CBSE studies! 🎓
