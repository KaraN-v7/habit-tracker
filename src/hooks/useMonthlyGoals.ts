import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface MonthlyGoal {
    id: string;
    title: string;
    completedDays: { [date: string]: boolean };
}

export interface MonthlyWin {
    id: string;
    content: string;
}

export interface MonthlyGoalsData {
    [monthKey: string]: {
        goals: MonthlyGoal[];
        wins: MonthlyWin[];
    };
}

export function useMonthlyGoals() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const DEFAULT_DATA: MonthlyGoalsData = {};

    const { data: monthlyData = DEFAULT_DATA, isLoading: loading, refetch } = useQuery({
        queryKey: ['monthlyGoals', user?.id],
        queryFn: async () => {
            if (!user) return {};

            // Fetch Goals
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

            // Fetch Wins
            const { data: winsData, error: winsError } = await supabase
                .from('monthly_wins')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (winsError) throw winsError;

            const dataMap: MonthlyGoalsData = {};

            // Process Goals
            goalsData?.forEach((goal: any) => {
                const monthKey = `${goal.year}-${goal.month}`;
                if (!dataMap[monthKey]) {
                    dataMap[monthKey] = { goals: [], wins: [] };
                }

                const completedDays: { [date: string]: boolean } = {};
                goal.monthly_goal_completions?.forEach((comp: any) => {
                    completedDays[comp.date] = comp.completed;
                });

                dataMap[monthKey].goals.push({
                    id: goal.goal_id,
                    title: goal.title,
                    completedDays
                });
            });

            // Process Wins
            winsData?.forEach((win: any) => {
                const monthKey = `${win.year}-${win.month}`;
                if (!dataMap[monthKey]) {
                    dataMap[monthKey] = { goals: [], wins: [] };
                }
                dataMap[monthKey].wins.push({
                    id: win.id,
                    content: win.content
                });
            });

            return dataMap;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
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
            const previousData = queryClient.getQueryData(['monthlyGoals', user?.id]);

            queryClient.setQueryData(['monthlyGoals', user?.id], (old: MonthlyGoalsData = {}) => ({
                ...old,
                [monthKey]: {
                    ...(old[monthKey] || { wins: [] }),
                    goals: monthlyGoals
                }
            }));

            return { previousData };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['monthlyGoals', user?.id], context.previousData);
            }
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
            const previousData = queryClient.getQueryData(['monthlyGoals', user?.id]);

            queryClient.setQueryData(['monthlyGoals', user?.id], (old: MonthlyGoalsData = {}) => ({
                ...old,
                [monthKey]: {
                    ...old[monthKey],
                    goals: old[monthKey]?.goals.map(g =>
                        g.id === goalId
                            ? { ...g, completedDays: { ...g.completedDays, [date]: completed } }
                            : g
                    ) || []
                }
            }));

            return { previousData };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['monthlyGoals', user?.id], context.previousData);
            }
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

            if (findError) return;

            const { error } = await supabase
                .from('monthly_goals')
                .update({ title: newTitle })
                .eq('id', monthlyGoal.id);

            if (error) throw error;
        },
        onMutate: async ({ monthKey, goalId, newTitle }) => {
            await queryClient.cancelQueries({ queryKey: ['monthlyGoals', user?.id] });
            const previousData = queryClient.getQueryData(['monthlyGoals', user?.id]);

            queryClient.setQueryData(['monthlyGoals', user?.id], (old: MonthlyGoalsData = {}) => ({
                ...old,
                [monthKey]: {
                    ...old[monthKey],
                    goals: old[monthKey]?.goals.map(g =>
                        g.id === goalId ? { ...g, title: newTitle } : g
                    ) || []
                }
            }));

            return { previousData };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['monthlyGoals', user?.id], context.previousData);
            }
        }
    });

    const addWinMutation = useMutation({
        mutationFn: async ({ monthKey, content }: { monthKey: string, content: string }) => {
            if (!user) return;
            const [year, month] = monthKey.split('-').map(Number);

            const { data, error } = await supabase
                .from('monthly_wins')
                .insert({
                    user_id: user.id,
                    year,
                    month,
                    content
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['monthlyGoals', user?.id] });
        }
    });

    const deleteWinMutation = useMutation({
        mutationFn: async (winId: string) => {
            const { error } = await supabase
                .from('monthly_wins')
                .delete()
                .eq('id', winId);
            if (error) throw error;
        },
        onSuccess: () => {
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

    const addWin = (monthKey: string, content: string) => {
        addWinMutation.mutate({ monthKey, content });
    };

    const deleteWin = (winId: string) => {
        deleteWinMutation.mutate(winId);
    };

    const goals = useMemo(() => Object.fromEntries(
        Object.entries(monthlyData).map(([key, val]) => [key, val.goals])
    ), [monthlyData]);

    const wins = useMemo(() => Object.fromEntries(
        Object.entries(monthlyData).map(([key, val]) => [key, val.wins])
    ), [monthlyData]);

    return {
        goals,
        wins,
        loading,
        user,
        saveGoals,
        updateGoalCompletion,
        updateGoalTitle,
        addWin,
        deleteWin,
        refreshGoals: refetch
    };
}
