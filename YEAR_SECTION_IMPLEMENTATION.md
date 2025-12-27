# Year Section Implementation

## Summary
Added "Year" section to both the **Analytics** and **Leaderboard** pages, allowing users to view yearly statistics and leaderboards.

## Changes Made

### 1. Analytics Page (`src/app/analytics/page.tsx`)

#### Type Updates
- Updated `ViewType` to include `'yearly'` option

#### UI Changes
- Added "Year" button to the view selector (Today, Week, Month, **Year**)

#### Logic Changes
- **`getDaysOfYear()`**: New helper function to get all days in a year
- **`calculateStats()`**: Added yearly case that:
  - Increments date by full years
  - Displays year label (e.g., "2025", "2024")
  - Calculates trend data for last 4 years
  
- **`getStatsForPeriod()`**: Added comprehensive yearly aggregation:
  - Daily goals: All goals from the entire year
  - Weekly goals: All weeks that overlap with the year
  - Monthly goals: All 12 months of the year
  - Subject distribution and study hours

### 2. Leaderboard Page

#### Hook Updates (`src/hooks/useLeaderboard.ts`)
- Updated `Period` type to include `'yearly'`
- **`getTimeRange()`**: Added yearly case:
  - Start: January 1st, 00:00:00
  - End: December 31st, 23:59:59

#### UI Changes (`src/app/leaderboard/page.tsx`)
- Added "Year" tab to period selector

#### Navigation Logic
- **`navigateDate()`**: Added yearly navigation (+/- 1 year)
- **`isNextDisabled()`**: Prevents navigating to future years
- **`getPeriodLabel()`**: Returns year as "2025" format

## Features

### Analytics Page - Yearly View
- **Charts**: Show last 4 years of data
- **Aggregation**: Combines all daily, weekly, and monthly goals for the year
- **Subject Stats**: Year-long subject distribution and task completion
- **Study Hours**: Total study hours accumulated over the year

### Leaderboard Page - Yearly View
- **Rankings**: Shows user rankings for the selected year
- **Navigation**: Arrow buttons to navigate between years
- **User Details**: Displays full year statistics when clicking a user
- **Real-time**: Updates automatically as points are earned

## Usage

### Analytics
1. Navigate to Analytics page
2. Click "Year" button
3. View charts showing last 4 years
4. Data auto-calculates from all goals (daily, weekly, monthly) for each year

### Leaderboard
1. Navigate to Leaderboard page
2. Click "Year" tab
3. Use arrows to navigate between years
4. Current year shows by default
5. Cannot navigate to future years

## Technical Details

### Year Boundaries
- Start: `January 1, 00:00:00`
- End: `December 31, 23:59:59`

### Data Aggregation
The yearly view aggregates:
- All daily goals from 365/366 days
- All weekly goals that intersect the year (including partial weeks at year boundaries)
- All monthly goals from all 12 months

### Performance
- Processes entire year of data (potentially 365+ days)
- Efficient aggregation using existing goal hooks
- Subject recognition applied to all year data
