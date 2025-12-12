import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface WeeklyGoal {
    id: string;
    title: string;
    completedDays: { [date: string]: boolean };
}

export interface WeeklyGoalsData {
    [weekKey: string]: WeeklyGoal[];
}

export function useWeeklyGoals() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: goals = {}, isLoading: loading, refetch } = useQuery({
        queryKey: ['weeklyGoals', user?.id],
        queryFn: async () => {
            if (!user) return {};

            const { data: goalsData, error: goalsError } = await supabase
                .from('weekly_goals')
                .select(`
                    *,
                    weekly_goal_completions (
                        date,
                        completed
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (goalsError) throw goalsError;

            const goalsMap: WeeklyGoalsData = {};
            goalsData?.forEach((goal: any) => {
                const weekKey = goal.week_start;
                if (!goalsMap[weekKey]) {
                    goalsMap[weekKey] = [];
                }

                const completedDays: { [date: string]: boolean } = {};
                goal.weekly_goal_completions?.forEach((comp: any) => {
                    completedDays[comp.date] = comp.completed;
                });

                goalsMap[weekKey].push({
                    id: goal.goal_id,
                    title: goal.title,
                    completedDays
                });
            });

            return goalsMap;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
    });

    const saveGoalsMutation = useMutation({
        mutationFn: async ({ weekKey, weeklyGoals }: { weekKey: string, weeklyGoals: WeeklyGoal[] }) => {
            if (!user) return;

            // Delete existing goals for this week
            await supabase
                .from('weekly_goals')
                .delete()
                .eq('user_id', user.id)
                .eq('week_start', weekKey);

            // Insert new goals
            for (const goal of weeklyGoals) {
                const { data: insertedGoal, error: insertError } = await supabase
                    .from('weekly_goals')
                    .insert({
                        user_id: user.id,
                        week_start: weekKey,
                        goal_id: goal.id,
                        title: goal.title
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                if (goal.completedDays && Object.keys(goal.completedDays).length > 0) {
                    const completions = Object.entries(goal.completedDays).map(([date, completed]) => ({
                        weekly_goal_id: insertedGoal.id,
                        date,
                        completed
                    }));

                    const { error: completionsError } = await supabase
                        .from('weekly_goal_completions')
                        .insert(completions);

                    if (completionsError) throw completionsError;
                }
            }
        },
        onMutate: async ({ weekKey, weeklyGoals }) => {
            await queryClient.cancelQueries({ queryKey: ['weeklyGoals', user?.id] });
            const previousGoals = queryClient.getQueryData(['weeklyGoals', user?.id]);

            queryClient.setQueryData(['weeklyGoals', user?.id], (old: WeeklyGoalsData = {}) => ({
                ...old,
                [weekKey]: weeklyGoals
            }));

            return { previousGoals };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousGoals) {
                queryClient.setQueryData(['weeklyGoals', user?.id], context.previousGoals);
            }
        }
    });

    const updateGoalCompletionMutation = useMutation({
        mutationFn: async ({ weekKey, goalId, date, completed }: { weekKey: string, goalId: string, date: string, completed: boolean }) => {
            if (!user) return;

            const { data: weeklyGoal, error: findError } = await supabase
                .from('weekly_goals')
                .select('id')
                .eq('user_id', user.id)
                .eq('week_start', weekKey)
                .eq('goal_id', goalId)
                .single();

            if (findError) throw findError;

            const { error: upsertError } = await supabase
                .from('weekly_goal_completions')
                .upsert({
                    weekly_goal_id: weeklyGoal.id,
                    date,
                    completed
                }, {
                    onConflict: 'weekly_goal_id,date'
                });

            if (upsertError) throw upsertError;
        },
        onMutate: async ({ weekKey, goalId, date, completed }) => {
            await queryClient.cancelQueries({ queryKey: ['weeklyGoals', user?.id] });
            const previousGoals = queryClient.getQueryData(['weeklyGoals', user?.id]);

            queryClient.setQueryData(['weeklyGoals', user?.id], (old: WeeklyGoalsData = {}) => ({
                ...old,
                [weekKey]: old[weekKey]?.map(g =>
                    g.id === goalId
                        ? { ...g, completedDays: { ...g.completedDays, [date]: completed } }
                        : g
                ) || []
            }));

            return { previousGoals };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousGoals) {
                queryClient.setQueryData(['weeklyGoals', user?.id], context.previousGoals);
            }
        }
    });

    const updateGoalTitleMutation = useMutation({
        mutationFn: async ({ weekKey, goalId, newTitle }: { weekKey: string, goalId: string, newTitle: string }) => {
            if (!user) return;

            const { data: weeklyGoal } = await supabase
                .from('weekly_goals')
                .select('id')
                .eq('user_id', user.id)
                .eq('week_start', weekKey)
                .eq('goal_id', goalId)
                .single();

            if (weeklyGoal) {
                const { error } = await supabase
                    .from('weekly_goals')
                    .update({ title: newTitle })
                    .eq('id', weeklyGoal.id);

                if (error) throw error;
            }
        },
        onMutate: async ({ weekKey, goalId, newTitle }) => {
            await queryClient.cancelQueries({ queryKey: ['weeklyGoals', user?.id] });
            const previousGoals = queryClient.getQueryData(['weeklyGoals', user?.id]);

            queryClient.setQueryData(['weeklyGoals', user?.id], (old: WeeklyGoalsData = {}) => ({
                ...old,
                [weekKey]: old[weekKey]?.map(g =>
                    g.id === goalId ? { ...g, title: newTitle } : g
                ) || []
            }));

            return { previousGoals };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousGoals) {
                queryClient.setQueryData(['weeklyGoals', user?.id], context.previousGoals);
            }
        }
    });

    const saveGoals = (weekKey: string, weeklyGoals: WeeklyGoal[]) => {
        saveGoalsMutation.mutate({ weekKey, weeklyGoals });
    };

    const updateGoalCompletion = (weekKey: string, goalId: string, date: string, completed: boolean) => {
        updateGoalCompletionMutation.mutate({ weekKey, goalId, date, completed });
    };

    const updateGoalTitle = (weekKey: string, goalId: string, newTitle: string) => {
        updateGoalTitleMutation.mutate({ weekKey, goalId, newTitle });
    };

    return {
        goals,
        loading,
        user,
        saveGoals,
        updateGoalCompletion,
        updateGoalTitle,
        refreshGoals: refetch
    };
}
