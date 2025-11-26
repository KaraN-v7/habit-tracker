import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Chapter {
    id: string;
    name: string;
    completed: boolean;
}

export interface Subject {
    id: string;
    name: string;
    color: string;
    chapters: Chapter[];
}

export function useSyllabus() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Get current user
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Load syllabus from Supabase
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        loadSyllabus();

        // Subscribe to real-time changes
        const subjectsChannel = supabase
            .channel('subjects_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'subjects',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    loadSyllabus();
                }
            )
            .subscribe();

        const chaptersChannel = supabase
            .channel('chapters_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chapters'
                },
                () => {
                    loadSyllabus();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subjectsChannel);
            supabase.removeChannel(chaptersChannel);
        };
    }, [user]);

    const loadSyllabus = async () => {
        if (!user) return;

        try {
            // Load subjects with chapters
            const { data: subjectsData, error: subjectsError } = await supabase
                .from('subjects')
                .select(`
          *,
          chapters (
            id,
            chapter_id,
            name,
            completed
          )
        `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (subjectsError) throw subjectsError;

            // Transform to app format
            const subjectsArray: Subject[] = subjectsData?.map((subject: any) => ({
                id: subject.subject_id,
                name: subject.name,
                color: subject.color,
                chapters: subject.chapters?.map((chapter: any) => ({
                    id: chapter.chapter_id,
                    name: chapter.name,
                    completed: chapter.completed
                })) || []
            })) || [];

            setSubjects(subjectsArray);
        } catch (error) {
            console.error('Error loading syllabus:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveSubjects = async (updatedSubjects: Subject[]) => {
        if (!user) return;

        try {
            // Delete all existing subjects and chapters (cascade will handle chapters)
            await supabase
                .from('subjects')
                .delete()
                .eq('user_id', user.id);

            // Insert new subjects and chapters
            for (const subject of updatedSubjects) {
                const { data: insertedSubject, error: subjectError } = await supabase
                    .from('subjects')
                    .insert({
                        user_id: user.id,
                        subject_id: subject.id,
                        name: subject.name,
                        color: subject.color
                    })
                    .select()
                    .single();

                if (subjectError) throw subjectError;

                // Insert chapters
                if (subject.chapters && subject.chapters.length > 0) {
                    const chapters = subject.chapters.map(chapter => ({
                        subject_id: insertedSubject.id,
                        chapter_id: chapter.id,
                        name: chapter.name,
                        completed: chapter.completed
                    }));

                    const { error: chaptersError } = await supabase
                        .from('chapters')
                        .insert(chapters);

                    if (chaptersError) throw chaptersError;
                }
            }

            // Update local state
            setSubjects(updatedSubjects);
        } catch (error) {
            console.error('Error saving syllabus:', error);
        }
    };

    const updateChapterCompletion = async (subjectId: string, chapterId: string, completed: boolean) => {
        if (!user) return;

        try {
            // Find the subject's database ID
            const { data: subject, error: subjectError } = await supabase
                .from('subjects')
                .select('id')
                .eq('user_id', user.id)
                .eq('subject_id', subjectId)
                .single();

            if (subjectError) throw subjectError;

            // Update chapter
            const { error: updateError } = await supabase
                .from('chapters')
                .update({ completed })
                .eq('subject_id', subject.id)
                .eq('chapter_id', chapterId);

            if (updateError) throw updateError;

            // Update local state
            setSubjects(prev =>
                prev.map(s =>
                    s.id === subjectId
                        ? {
                            ...s,
                            chapters: s.chapters.map(c =>
                                c.id === chapterId ? { ...c, completed } : c
                            )
                        }
                        : s
                )
            );
        } catch (error) {
            console.error('Error updating chapter completion:', error);
        }
    };

    const updateSubjectName = async (subjectId: string, newName: string) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('subjects')
                .update({ name: newName })
                .eq('user_id', user.id)
                .eq('subject_id', subjectId);

            if (error) throw error;

            setSubjects(prev =>
                prev.map(s =>
                    s.id === subjectId ? { ...s, name: newName } : s
                )
            );
        } catch (error) {
            console.error('Error updating subject name:', error);
            throw error;
        }
    };

    const updateChapterName = async (subjectId: string, chapterId: string, newName: string) => {
        if (!user) return;

        try {
            // Find the subject's database ID
            const { data: subject, error: subjectError } = await supabase
                .from('subjects')
                .select('id')
                .eq('user_id', user.id)
                .eq('subject_id', subjectId)
                .single();

            if (subjectError) throw subjectError;

            const { error } = await supabase
                .from('chapters')
                .update({ name: newName })
                .eq('subject_id', subject.id)
                .eq('chapter_id', chapterId);

            if (error) throw error;

            setSubjects(prev =>
                prev.map(s =>
                    s.id === subjectId
                        ? {
                            ...s,
                            chapters: s.chapters.map(c =>
                                c.id === chapterId ? { ...c, name: newName } : c
                            )
                        }
                        : s
                )
            );
        } catch (error) {
            console.error('Error updating chapter name:', error);
            throw error;
        }
    };

    return {
        subjects,
        loading,
        user,
        saveSubjects,
        updateChapterCompletion,
        updateSubjectName,
        updateChapterName,
        refreshSyllabus: loadSyllabus
    };
}
