# Student Habit Tracker 📚

A comprehensive habit tracking application designed specifically for students to manage their daily, weekly, and monthly goals, track syllabus progress, and visualize their productivity through detailed analytics.

![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![React](https://img.shields.io/badge/React-19.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-2.84-green)

## ✨ Features

### 📋 Goal Management
- **Daily Goals**: Create and track daily tasks with a Notion-like block editor
- **Weekly Goals**: Set recurring weekly goals with daily completion tracking
- **Monthly Goals**: Plan monthly objectives with progress visualization
- **Flexible Goal Types**: Toggle between tasks and notes

### 📚 Syllabus Tracker
- **Subject Management**: Organize subjects with custom colors
- **Chapter Tracking**: Add and track chapters within each subject
- **Progress Visualization**: Individual and overall progress pie charts
- **Quick Actions**: Push chapters to daily goals with one click

### 📊 Analytics Dashboard
- **Multi-Period Views**: Analyze daily, weekly, and monthly progress
- **Goal Completion Charts**: Visual representation of completed vs pending goals
- **Study Time Tracking**: Automatic extraction and tracking of study hours
- **Subject-wise Analysis**: Detailed breakdown by subject with color-coded charts
- **Task Completion Trends**: Track productivity over time

### 👤 User Profile
- **Profile Customization**: Update display name and profile picture
- **Image Cropping**: Built-in image cropper for profile pictures
- **Google OAuth**: Seamless authentication with Google
- **Theme Toggle**: Switch between light and dark modes

### 🎨 Design
- **Notion-inspired UI**: Clean, minimal interface
- **Fully Responsive**: Optimized for mobile, tablet, and desktop
- **Dark Mode**: Easy on the eyes with automatic theme switching
- **Modern Aesthetics**: Smooth animations and transitions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- A Supabase account ([sign up here](https://supabase.com))
- Git installed

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd habit-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase**
   
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the SQL scripts in order:
     1. `supabase-setup.sql` (Required - creates all tables)
     2. `subject-recognition-setup-v2.sql` (Optional - enables subject recognition)
   
   - Create an `avatars` storage bucket:
     - Go to Storage → Create bucket
     - Name: `avatars`
     - Public bucket: Yes
     - Add RLS policies as needed

5. **Configure Google OAuth** (Optional)
   
   - Go to Supabase → Authentication → Providers
   - Enable Google provider
   - Add your OAuth credentials
   - Update redirect URLs

6. **Run development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Click Deploy

3. **Update Supabase Settings**
   - Add your Vercel URL to Supabase Auth redirect URLs
   - Update Google OAuth authorized URLs (if using)

See `DEPLOYMENT_CHECKLIST.md` for detailed deployment instructions.

## 🏗️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: CSS Modules with CSS Variables
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Google OAuth
- **Charts**: Recharts
- **Icons**: Lucide React
- **Image Cropping**: react-easy-crop

## 📁 Project Structure

```
habit-tracker/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── analytics/    # Analytics page
│   │   ├── login/        # Login page
│   │   ├── profile/      # Profile page
│   │   ├── syllabus/     # Syllabus tracker
│   │   ├── weekly/       # Weekly goals
│   │   ├── monthly/      # Monthly goals
│   │   └── page.tsx      # Daily goals (home)
│   ├── components/       # React components
│   │   ├── AppContent/   # App wrapper with auth
│   │   ├── Sidebar/      # Navigation sidebar
│   │   ├── Logo/         # Logo component
│   │   └── ThemeToggle/  # Theme switcher
│   ├── context/          # React contexts
│   │   ├── AuthContext   # Authentication state
│   │   └── ThemeContext  # Theme state
│   ├── hooks/            # Custom React hooks
│   │   ├── useDailyGoals
│   │   ├── useWeeklyGoals
│   │   ├── useMonthlyGoals
│   │   ├── useSyllabus
│   │   └── useSubjectRecognition
│   ├── lib/              # Utilities
│   │   └── supabase.ts   # Supabase client
│   └── utils/            # Helper functions
├── public/               # Static assets
└── SQL Scripts/          # Database setup scripts
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

### Database Tables

- `daily_goals` - Daily goal entries
- `weekly_goals` - Weekly recurring goals
- `monthly_goals` - Monthly objectives
- `subjects` - Subject definitions
- `chapters` - Syllabus chapters
- `subject_mappings` - Subject recognition data (optional)
- `subject_variations` - Subject name variations (optional)
- `user_preferences` - User settings and preferences

## 📖 Documentation

- [Architecture Overview](ARCHITECTURE.md) - System architecture and design decisions
- [Hooks Documentation](HOOKS_DOCUMENTATION.md) - Custom React hooks reference
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Complete deployment guide
- [Subject Recognition Setup](QUICKSTART_SUBJECT_RECOGNITION.md) - Subject detection guide

## 🐛 Known Issues

- Minor recharts dimension warnings on mobile (non-blocking)
- CSS preload optimization notices (performance-related, not critical)

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📄 License

MIT License - feel free to use this project as you wish.

## 🙏 Acknowledgments

- Design inspired by Notion
- Built with Next.js and Supabase
- Charts powered by Recharts

## 📞 Support

For issues or questions:
1. Check the documentation files
2. Review the SQL setup scripts
3. Verify Supabase configuration
4. Check environment variables

---

**Happy tracking! 🎯**
