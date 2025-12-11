# 📝 Notion-Style Notes Feature

## Overview
A Notion-inspired notes section has been added to your Habit Tracker. Users can create multiple note pages with a block-based editor similar to Notion.

## Key Features

### ✨ **Notion-Style Editor**
- **Block-Based Writing**: Each line/paragraph is a "block" that can be independently styled
- **Free Writing**: Type continuously like in a document
- **Multiple Block Types**:
  - **Text**: Regular paragraphs
  - **Heading 1, 2, 3**: Different heading sizes
  - **Checkbox**: Tickable items (for to-do lists within notes)

### 🎯 **How It Works**
1. **Create Notes**: Click the "+" button in the sidebar Notes section
2. **Write Freely**: Type naturally in the editor
3. **Convert Blocks**: 
   - Press `/` in an empty block to open the type menu
   - Or click the Type icon (appears on hover) to change block type
4. **Add Checkboxes**: Convert any block to a checkbox for tickable items
5. **Keyboard Shortcuts**:
   - `Enter`: Create new block below
   - `Backspace` (in empty block): Delete block
   - `/`: Open block type menu

### 🔒 **Completely Separate**
Notes are **completely isolated** from your goal tracking:
- ❌ NOT counted in Daily/Weekly/Monthly goals
- ❌ NOT included in Analytics
- ❌ NOT part of the Subjects section
- ❌ NO impact on Leaderboard points

This is purely for personal note-taking!

## Files Created/Modified

### Database
- `NOTES_FEATURE.sql` - Database migration for `notes` and `note_blocks` tables

### Types
- `src/types/note.ts` - TypeScript interfaces for Note and NoteBlock

### Hooks
- `src/hooks/useNotes.ts` - Manage notes list
- `src/hooks/useNoteDetails.ts` - Manage individual note and blocks

### Components
- `src/components/Sidebar/SidebarNotes.tsx` - Notes list in sidebar
- `src/components/Sidebar/Sidebar.tsx` - Updated to include notes section
- `src/components/Sidebar/Sidebar.module.css` - Styles for notes section

### Pages
- `src/app/notes/[id]/page.tsx` - Notion-style editor page
- `src/app/notes/[id]/NotePage.module.css` - Styles for the editor

## Setup Instructions

### 1. Run Database Migration
Go to your **Supabase Dashboard** → **SQL Editor** and run:

\`\`\`sql
-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT DEFAULT 'Untitled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Policies for notes
DROP POLICY IF EXISTS "Users can only see their own notes" ON notes;
CREATE POLICY "Users can only see their own notes" ON notes
  FOR ALL USING (auth.uid() = user_id);

-- Create note_blocks table (like Notion blocks)
CREATE TABLE IF NOT EXISTS note_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
  block_type TEXT DEFAULT 'text', -- 'text', 'checkbox', 'heading1', 'heading2', 'heading3'
  content TEXT DEFAULT '',
  is_checked BOOLEAN DEFAULT FALSE, -- only used for checkbox type
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE note_blocks ENABLE ROW LEVEL SECURITY;

-- Policies for note_blocks
DROP POLICY IF EXISTS "Users can manage blocks of their own notes" ON note_blocks;
CREATE POLICY "Users can manage blocks of their own notes" ON note_blocks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM notes WHERE id = note_blocks.note_id AND user_id = auth.uid())
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
CREATE INDEX IF NOT EXISTS note_blocks_note_id_idx ON note_blocks(note_id);
CREATE INDEX IF NOT EXISTS note_blocks_position_idx ON note_blocks(note_id, position);
\`\`\`

### 2. Test the Feature
1. Start your dev server: `npm run dev`
2. Look for the **Notes** section in the sidebar (below main navigation)
3. Click the **+** button to create your first note
4. Start typing and press `/` to try different block types!

## Usage Examples

### Example 1: Meeting Notes
\`\`\`
# Meeting with Team (Heading 1)
## Action Items (Heading 2)
☑ Review the proposal (Checkbox - checked)
☐ Send follow-up email (Checkbox - unchecked)

## Notes (Heading 2)
The meeting went well. We discussed... (Text)
\`\`\`

### Example 2: Study Notes
\`\`\`
# Physics Chapter 5 (Heading 1)
### Key Concepts (Heading 3)
Newton's laws of motion apply to... (Text)

☐ Practice problems 1-10 (Checkbox)
☐ Review formulas (Checkbox)
\`\`\`

## Architecture

### Database Schema
\`\`\`
notes
├── id (UUID)
├── user_id (UUID) → references auth.users
├── title (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

note_blocks
├── id (UUID)
├── note_id (UUID) → references notes
├── block_type (TEXT: 'text', 'checkbox', 'heading1', 'heading2', 'heading3')
├── content (TEXT)
├── is_checked (BOOLEAN)
├── position (INTEGER)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
\`\`\`

### Block Types
| Type | Description | Use Case |
|------|-------------|----------|
| `text` | Regular paragraph | General writing |
| `heading1` | Large heading | Main sections |
| `heading2` | Medium heading | Sub-sections |
| `heading3` | Small heading | Minor sections |
| `checkbox` | Tickable item | To-do lists, action items |

## Future Enhancements (Optional)
- 📋 Drag-and-drop block reordering
- 🎨 Block colors and highlights
- 📎 File attachments
- 🔗 Internal linking between notes
- 📁 Note folders/organization
- 🔍 Search within notes
- 📤 Export notes as PDF/Markdown

---

**Enjoy your new Notion-style notes! 🎉**
