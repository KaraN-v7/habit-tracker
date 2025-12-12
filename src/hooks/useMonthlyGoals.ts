import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface MonthlyGoal {
    id: string;
    title: string;
    completedDays: { [date: string]: boolean };
}

export interface MonthlyGoalsData {
    [monthKey: string]: MonthlyGoal[];
}

export function useMonthlyGoals() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: goals = {}, isLoading: loading, refetch } = useQuery({
        queryKey: ['monthlyGoals', user?.id],
        queryFn: async () => {
            if (!user) return {};

            const { data: goalsData, error: goalsError } = await supabase
                .from('monthly_goals')
                .select(`
                    *,
                    monthly_goal_completions (
                        date,
                        completed
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (goalsError) throw goalsError;

            const goalsMap: MonthlyGoalsData = {};
            goalsData?.forEach((goal: any) => {
                const monthKey = `${goal.year}-${goal.month}`;
                if (!goalsMap[monthKey]) {
                    goalsMap[monthKey] = [];
                }

                const completedDays: { [date: string]: boolean } = {};
                goal.monthly_goal_completions?.forEach((comp: any) => {
                    completedDays[comp.date] = comp.completed;
                });

                goalsMap[monthKey].push({
                    id: goal.goal_id,
                    title: goal.title,
                    completedDays
                });
            });

            return goalsMap;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
    });

    const saveGoalsMutation = useMutation({
        mutationFn: async ({ monthKey, monthlyGoals }: { monthKey: string, monthlyGoals: MonthlyGoal[] }) => {
            if (!user) return;
            const [year, month] = monthKey.split('-').map(Number);

            // Delete existing goals for this month
            await supabase
                .from('monthly_goals')
                .delete()
                .eq('user_id', user.id)
                .eq('year', year)
                .eq('month', month);

            // Insert new goals
            for (const goal of monthlyGoals) {
                const { data: insertedGoal, error: insertError } = await supabase
                    .from('monthly_goals')
                    .insert({
                        user_id: user.id,
                        year,
                        month,
                        goal_id: goal.id,
                        title: goal.title
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                if (goal.completedDays && Object.keys(goal.completedDays).length > 0) {
                    const completions = Object.entries(goal.completedDays).map(([date, completed]) => ({
                        monthly_goal_id: insertedGoal.id,
                        date,
                        completed
                    }));

                    const { error: completionsError } = await supabase
                        .from('monthly_goal_completions')
                        .insert(completions);

                    if (completionsError) throw completionsError;
                }
            }
        },
        onMutate: async ({ monthKey, monthlyGoals }) => {
            await queryClient.cancelQueries({ queryKey: ['monthlyGoals', user?.id] });
            const previousGoals = queryClient.getQueryData(['monthlyGoals', user?.id]);

            queryClient.setQueryData(['monthlyGoals', user?.id], (old: MonthlyGoalsData = {}) => ({
                ...old,
                [monthKey]: monthlyGoals
            }));

            return { previousGoals };
        },
        onError: (_err, _newTodo, context) => {
            if (context?.previousGoals) {
                queryClient.setQueryData(['monthlyGoals', user?.id], context.previousGoals);
            }
        },
        onSettled: () => {
            // Invalidate to ensure consistency, but allow it to happen in background
            queryClient.invalidateQueries({ queryKey: ['monthlyGoals', user?.id] });
        }
    });

    const updateGoalCompletionMutation = useMutation({
        mutationFn: async ({ monthKey, goalId, date, completed }: { monthKey: string, goalId: string, date: string, completed: boolean }) => {
            if (!user) return;
            const [year, month] = monthKey.split('-').map(Number);

            const { data: monthlyGoal, error: findError } = await supabase
                .from('monthly_goals')
                .select('id')
                .eq('user_id', user.id)
                .eq('year', year)
                .eq('month', month)
                .eq('goal_id', goalId)
                .single();

            if (findError) throw findError;

            const { error: upsertError } = await supabase
                .from('monthly_goal_completions')
                .upsert({
                    monthly_goal_id: monthlyGoal.id,
                    date,
                    completed
                }, {
                    onConflict: 'monthly_goal_id,date'
                });

            if (upsertError) throw upsertError;
        },
        onMutate: async ({ monthKey, goalId, date, completed }) => {
            await queryClient.cancelQueries({ queryKey: ['monthlyGoals', user?.id] });
            const previousGoals = queryClient.getQueryData(['monthlyGoals', user?.id]);

            queryClient.setQueryData(['monthlyGoals', user?.id], (old: MonthlyGoalsData = {}) => ({
                ...old,
                [monthKey]: old[monthKey]?.map(g =>
                    g.id === goalId
                        ? { ...g, completedDays: { ...g.completedDays, [date]: completed } }
                        : g
                ) || []
            }));

            return { previousGoals };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousGoals) {
                queryClient.setQueryData(['monthlyGoals', user?.id], context.previousGoals);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['monthlyGoals', user?.id] });
        }
    });

    const updateGoalTitleMutation = useMutation({
        mutationFn: async ({ monthKey, goalId, newTitle }: { monthKey: string, goalId: string, newTitle: string }) => {
            if (!user) return;
            const [year, month] = monthKey.split('-').map(Number);

            const { data: monthlyGoal, error: findError } = await supabase
                .from('monthly_goals')
                .select('id')
                .eq('user_id', user.id)
                .eq('year', year)
                .eq('month', month)
                .eq('goal_id', goalId)
                .single();

            if (findError) return; // Might be new goal passed to saveGoals

            const { error } = await supabase
                .from('monthly_goals')
                .update({ title: newTitle })
                .eq('id', monthlyGoal.id);

            if (error) throw error;
        },
        onMutate: async ({ monthKey, goalId, newTitle }) => {
            await queryClient.cancelQueries({ queryKey: ['monthlyGoals', user?.id] });
            const previousGoals = queryClient.getQueryData(['monthlyGoals', user?.id]);

            queryClient.setQueryData(['monthlyGoals', user?.id], (old: MonthlyGoalsData = {}) => ({
                ...old,
                [monthKey]: old[monthKey]?.map(g =>
                    g.id === goalId ? { ...g, title: newTitle } : g
                ) || []
            }));

            return { previousGoals };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousGoals) {
                queryClient.setQueryData(['monthlyGoals', user?.id], context.previousGoals);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['monthlyGoals', user?.id] });
        }
    });

    const saveGoals = (monthKey: string, monthlyGoals: MonthlyGoal[]) => {
        saveGoalsMutation.mutate({ monthKey, monthlyGoals });
    };

    const updateGoalCompletion = (monthKey: string, goalId: string, date: string, completed: boolean) => {
        updateGoalCompletionMutation.mutate({ monthKey, goalId, date, completed });
    };

    const updateGoalTitle = (monthKey: string, goalId: string, newTitle: string) => {
        updateGoalTitleMutation.mutate({ monthKey, goalId, newTitle });
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
