import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export type BlockType = 'text' | 'todo';
export type GoalSource = 'daily' | 'weekly' | 'monthly';

export interface Block {
    id: string;
    type: BlockType;
    content: string;
    completed: boolean;
    source?: GoalSource;
    parentId?: string;
}

export interface DailyGoals {
    [date: string]: Block[];
}

export function useDailyGoals() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: goals = {}, isLoading: loading, refetch } = useQuery({
        queryKey: ['dailyGoals', user?.id],
        queryFn: async () => {
            if (!user) return {};

            const { data, error } = await supabase
                .from('daily_goals')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            const goalsMap: DailyGoals = {};
            data?.forEach((goal) => {
                const dateKey = goal.date;
                if (!goalsMap[dateKey]) {
                    goalsMap[dateKey] = [];
                }
                goalsMap[dateKey].push({
                    id: goal.block_id,
                    type: goal.type as BlockType,
                    content: goal.content,
                    completed: goal.completed,
                    source: goal.source as GoalSource,
                    parentId: goal.parent_id
                });
            });

            return goalsMap;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
    });

    const saveGoalsMutation = useMutation({
        mutationFn: async ({ dateKey, blocks }: { dateKey: string, blocks: Block[] }) => {
            if (!user) return;

            // Delete existing goals for this date (daily only)
            await supabase
                .from('daily_goals')
                .delete()
                .eq('user_id', user.id)
                .eq('date', dateKey)
                .eq('source', 'daily');

            // Insert new goals
            const goalsToInsert = blocks
                .filter(b => !b.source || b.source === 'daily')
                .map(block => ({
                    user_id: user.id,
                    date: dateKey,
                    block_id: block.id,
                    type: block.type,
                    content: block.content,
                    completed: block.completed,
                    source: block.source || 'daily',
                    parent_id: block.parentId
                }));

            if (goalsToInsert.length > 0) {
                const { error } = await supabase
                    .from('daily_goals')
                    .insert(goalsToInsert);

                if (error) throw error;
            }
        },
        onMutate: async ({ dateKey, blocks }) => {
            await queryClient.cancelQueries({ queryKey: ['dailyGoals', user?.id] });
            const previousGoals = queryClient.getQueryData(['dailyGoals', user?.id]);

            queryClient.setQueryData(['dailyGoals', user?.id], (old: DailyGoals = {}) => ({
                ...old,
                [dateKey]: blocks.filter(b => !b.source || b.source === 'daily')
            }));

            return { previousGoals };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousGoals) {
                queryClient.setQueryData(['dailyGoals', user?.id], context.previousGoals);
            }
        }
    });

    const updateGoalCompletionMutation = useMutation({
        mutationFn: async ({ dateKey, blockId, completed }: { dateKey: string, blockId: string, completed: boolean }) => {
            if (!user) return;

            // Find block info for syllabus sync
            const currentGoals = queryClient.getQueryData(['dailyGoals', user?.id]) as DailyGoals;
            const block = currentGoals?.[dateKey]?.find(b => b.id === blockId);
            const parentId = block?.parentId;

            const { error } = await supabase
                .from('daily_goals')
                .update({ completed })
                .eq('user_id', user.id)
                .eq('date', dateKey)
                .eq('block_id', blockId);

            if (error) throw error;

            // Sync with Syllabus Chapter if parentId exists
            if (parentId) {
                const { error: chapterError } = await supabase
                    .from('chapters')
                    .update({ completed })
                    .eq('chapter_id', parentId);

                if (chapterError) {
                    console.error('Error syncing chapter completion:', chapterError);
                }
            }
        },
        onMutate: async ({ dateKey, blockId, completed }) => {
            await queryClient.cancelQueries({ queryKey: ['dailyGoals', user?.id] });
            const previousGoals = queryClient.getQueryData(['dailyGoals', user?.id]);

            queryClient.setQueryData(['dailyGoals', user?.id], (old: DailyGoals = {}) => ({
                ...old,
                [dateKey]: old[dateKey]?.map(b =>
                    b.id === blockId ? { ...b, completed } : b
                ) || []
            }));

            return { previousGoals };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousGoals) {
                queryClient.setQueryData(['dailyGoals', user?.id], context.previousGoals);
            }
        }
    });

    const updateBlockContentMutation = useMutation({
        mutationFn: async ({ dateKey, blockId, updates }: { dateKey: string, blockId: string, updates: Partial<Block> }) => {
            if (!user) return;

            const dbUpdates: any = {};
            if ('content' in updates) dbUpdates.content = updates.content;
            if ('type' in updates) dbUpdates.type = updates.type;

            const { error } = await supabase
                .from('daily_goals')
                .update(dbUpdates)
                .eq('user_id', user.id)
                .eq('date', dateKey)
                .eq('block_id', blockId);

            if (error) throw error;
        },
        onMutate: async ({ dateKey, blockId, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['dailyGoals', user?.id] });
            const previousGoals = queryClient.getQueryData(['dailyGoals', user?.id]);

            queryClient.setQueryData(['dailyGoals', user?.id], (old: DailyGoals = {}) => ({
                ...old,
                [dateKey]: old[dateKey]?.map(b =>
                    b.id === blockId ? { ...b, ...updates } : b
                ) || []
            }));

            return { previousGoals };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousGoals) {
                queryClient.setQueryData(['dailyGoals', user?.id], context.previousGoals);
            }
        }
    });

    // Legacy addGoal function was not heavily used in main page but good to support
    const addGoalMutation = useMutation({
        mutationFn: async ({ dateKey, block }: { dateKey: string, block: Block }) => {
            if (!user) return;
            const goalToInsert = {
                user_id: user.id,
                date: dateKey,
                block_id: block.id,
                type: block.type,
                content: block.content,
                completed: block.completed,
                source: block.source || 'daily',
                parent_id: block.parentId
            };

            const { error } = await supabase
                .from('daily_goals')
                .insert(goalToInsert);

            if (error) throw error;
        },
        onMutate: async ({ dateKey, block }) => {
            await queryClient.cancelQueries({ queryKey: ['dailyGoals', user?.id] });
            const previousGoals = queryClient.getQueryData(['dailyGoals', user?.id]);

            queryClient.setQueryData(['dailyGoals', user?.id], (old: DailyGoals = {}) => ({
                ...old,
                [dateKey]: [...(old[dateKey] || []), block]
            }));

            return { previousGoals };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousGoals) {
                queryClient.setQueryData(['dailyGoals', user?.id], context.previousGoals);
            }
        }
    });


    const saveGoals = (dateKey: string, blocks: Block[]) => {
        saveGoalsMutation.mutate({ dateKey, blocks });
    };

    const updateGoalCompletion = (dateKey: string, blockId: string, completed: boolean) => {
        updateGoalCompletionMutation.mutate({ dateKey, blockId, completed });
    };

    const updateBlockContent = (dateKey: string, blockId: string, updates: Partial<Block>) => {
        updateBlockContentMutation.mutate({ dateKey, blockId, updates });
    };

    const addGoal = (dateKey: string, block: Block) => {
        addGoalMutation.mutate({ dateKey, block });
    };

    return {
        goals,
        loading,
        user,
        saveGoals,
        addGoal,
        updateGoalCompletion,
        updateBlockContent,
        refreshGoals: refetch
    };
}
