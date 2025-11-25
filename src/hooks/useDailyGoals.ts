import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
    const [goals, setGoals] = useState<DailyGoals>({});
    const [loading, setLoading] = useState(false);
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

    // Load goals from Supabase
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }


        loadGoals();

        // Real-time subscriptions disabled for performance
        // Optimistic updates already handle UI changes immediately
        /*
        const channel = supabase
            .channel('daily_goals_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'daily_goals',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    loadGoals();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        */
    }, [user]);

    const loadGoals = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('daily_goals')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Transform database format to app format
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

            setGoals(goalsMap);
        } catch (error) {
            console.error('Error loading daily goals:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveGoals = async (dateKey: string, blocks: Block[]) => {
        if (!user) return;

        try {
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

            // Update local state
            setGoals(prev => ({
                ...prev,
                [dateKey]: blocks.filter(b => !b.source || b.source === 'daily')
            }));
        } catch (error: any) {
            console.error('Error saving daily goals:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
                fullError: error
            });
        }
    };

    const updateGoalCompletion = async (dateKey: string, blockId: string, completed: boolean) => {
        if (!user) return;

        // Find the block to check for parentId
        const block = goals[dateKey]?.find(b => b.id === blockId);
        const parentId = block?.parentId;

        try {
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

            // Update local state
            setGoals(prev => ({
                ...prev,
                [dateKey]: prev[dateKey]?.map(b =>
                    b.id === blockId ? { ...b, completed } : b
                ) || []
            }));
        } catch (error) {
            console.error('Error updating goal completion:', error);
        }
    };

    const addGoal = async (dateKey: string, block: Block) => {
        if (!user) return;

        try {
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

            // Update local state
            setGoals(prev => ({
                ...prev,
                [dateKey]: [...(prev[dateKey] || []), block]
            }));
        } catch (error: any) {
            console.error('Error adding daily goal:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
                fullError: error
            });
        }
    };

    const updateBlockContent = async (dateKey: string, blockId: string, updates: Partial<Block>) => {
        if (!user) return;

        // Optimistic update
        setGoals(prev => ({
            ...prev,
            [dateKey]: prev[dateKey]?.map(b =>
                b.id === blockId ? { ...b, ...updates } : b
            ) || []
        }));

        try {
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
        } catch (error) {
            console.error('Error updating block content:', error);
        }
    };

    return {
        goals,
        loading,
        user,
        saveGoals,
        addGoal,
        updateGoalCompletion,
        updateBlockContent,
        refreshGoals: loadGoals
    };
}
