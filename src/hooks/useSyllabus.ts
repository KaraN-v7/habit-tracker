import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

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
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: subjects = [], isLoading: loading, refetch } = useQuery({
        queryKey: ['syllabus', user?.id],
        queryFn: async () => {
            if (!user) return [];

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

            return subjectsArray;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
    });

    const saveSubjectsMutation = useMutation({
        mutationFn: async (updatedSubjects: Subject[]) => {
            if (!user) return;

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
        },
        onMutate: async (updatedSubjects) => {
            await queryClient.cancelQueries({ queryKey: ['syllabus', user?.id] });
            const previousSubjects = queryClient.getQueryData(['syllabus', user?.id]);

            queryClient.setQueryData(['syllabus', user?.id], updatedSubjects);

            return { previousSubjects };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousSubjects) {
                queryClient.setQueryData(['syllabus', user?.id], context.previousSubjects);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['syllabus', user?.id] });
        }
    });

    const updateChapterCompletionMutation = useMutation({
        mutationFn: async ({ subjectId, chapterId, completed }: { subjectId: string, chapterId: string, completed: boolean }) => {
            if (!user) return;

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
        },
        onMutate: async ({ subjectId, chapterId, completed }) => {
            await queryClient.cancelQueries({ queryKey: ['syllabus', user?.id] });
            const previousSubjects = queryClient.getQueryData(['syllabus', user?.id]);

            queryClient.setQueryData(['syllabus', user?.id], (old: Subject[] = []) =>
                old.map(s =>
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

            return { previousSubjects };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousSubjects) {
                queryClient.setQueryData(['syllabus', user?.id], context.previousSubjects);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['syllabus', user?.id] });
        }
    });

    const updateSubjectNameMutation = useMutation({
        mutationFn: async ({ subjectId, newName }: { subjectId: string, newName: string }) => {
            if (!user) return;

            const { error } = await supabase
                .from('subjects')
                .update({ name: newName })
                .eq('user_id', user.id)
                .eq('subject_id', subjectId);

            if (error) throw error;
        },
        onMutate: async ({ subjectId, newName }) => {
            await queryClient.cancelQueries({ queryKey: ['syllabus', user?.id] });
            const previousSubjects = queryClient.getQueryData(['syllabus', user?.id]);

            queryClient.setQueryData(['syllabus', user?.id], (old: Subject[] = []) =>
                old.map(s =>
                    s.id === subjectId ? { ...s, name: newName } : s
                )
            );

            return { previousSubjects };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousSubjects) {
                queryClient.setQueryData(['syllabus', user?.id], context.previousSubjects);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['syllabus', user?.id] });
        }
    });

    const updateChapterNameMutation = useMutation({
        mutationFn: async ({ subjectId, chapterId, newName }: { subjectId: string, chapterId: string, newName: string }) => {
            if (!user) return;

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
        },
        onMutate: async ({ subjectId, chapterId, newName }) => {
            await queryClient.cancelQueries({ queryKey: ['syllabus', user?.id] });
            const previousSubjects = queryClient.getQueryData(['syllabus', user?.id]);

            queryClient.setQueryData(['syllabus', user?.id], (old: Subject[] = []) =>
                old.map(s =>
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

            return { previousSubjects };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousSubjects) {
                queryClient.setQueryData(['syllabus', user?.id], context.previousSubjects);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['syllabus', user?.id] });
        }
    });

    const saveSubjects = (updatedSubjects: Subject[]) => {
        saveSubjectsMutation.mutate(updatedSubjects);
    };

    const updateChapterCompletion = (subjectId: string, chapterId: string, completed: boolean) => {
        updateChapterCompletionMutation.mutate({ subjectId, chapterId, completed });
    };

    const updateSubjectName = (subjectId: string, newName: string) => {
        updateSubjectNameMutation.mutate({ subjectId, newName });
    };

    const updateChapterName = (subjectId: string, chapterId: string, newName: string) => {
        updateChapterNameMutation.mutate({ subjectId, chapterId, newName });
    };

    return {
        subjects,
        loading,
        user,
        saveSubjects,
        updateChapterCompletion,
        updateSubjectName,
        updateChapterName,
        refreshSyllabus: refetch
    };
}
