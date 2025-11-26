import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface MonthlyGoal {
    id: string;
    title: string;
    completedDays: { [date: string]: boolean };
}

export interface MonthlyGoalsData {
    [monthKey: string]: MonthlyGoal[];
}

export function useMonthlyGoals() {
    const [goals, setGoals] = useState<MonthlyGoalsData>({});
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
        const goalsChannel = supabase
            .channel('monthly_goals_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'monthly_goals',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    loadGoals();
                }
            )
            .subscribe();

        const completionsChannel = supabase
            .channel('monthly_completions_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'monthly_goal_completions'
                },
                () => {
                    loadGoals();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(goalsChannel);
            supabase.removeChannel(completionsChannel);
        };
        */
    }, [user]);

    const loadGoals = async () => {
        if (!user) return;

        try {
            // Load monthly goals
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

            // Transform to app format
            const goalsMap: MonthlyGoalsData = {};
            goalsData?.forEach((goal: any) => {
                const monthKey = `${goal.year}-${goal.month}`;
                if (!goalsMap[monthKey]) {
                    goalsMap[monthKey] = [];
                }

                // Build completedDays map
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

            setGoals(goalsMap);
        } catch (error) {
            console.error('Error loading monthly goals:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveGoals = async (monthKey: string, monthlyGoals: MonthlyGoal[]) => {
        if (!user) return;

        try {
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

                // Insert completions
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

            // Update local state
            setGoals(prev => ({
                ...prev,
                [monthKey]: monthlyGoals
            }));
        } catch (error) {
            console.error('Error saving monthly goals:', error);
        }
    };

    const updateGoalCompletion = async (monthKey: string, goalId: string, date: string, completed: boolean) => {
        if (!user) return;

        // Store previous state for potential revert
        const previousState = goals[monthKey]?.find(g => g.id === goalId)?.completedDays?.[date];

        // Optimistic update
        setGoals(prev => ({
            ...prev,
            [monthKey]: prev[monthKey]?.map(g =>
                g.id === goalId
                    ? { ...g, completedDays: { ...g.completedDays, [date]: completed } }
                    : g
            ) || []
        }));

        try {
            const [year, month] = monthKey.split('-').map(Number);

            // Find the monthly goal
            const { data: monthlyGoal, error: findError } = await supabase
                .from('monthly_goals')
                .select('id')
                .eq('user_id', user.id)
                .eq('year', year)
                .eq('month', month)
                .eq('goal_id', goalId)
                .single();

            if (findError) throw findError;

            // Upsert completion
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
        } catch (error: any) {
            const msg = error.message || error.details || error.hint || 'Unknown error';
            // Revert the optimistic update
            setGoals(prev => ({
                ...prev,
                [monthKey]: prev[monthKey]?.map(g =>
                    g.id === goalId
                        ? { ...g, completedDays: { ...g.completedDays, [date]: previousState || false } }
                        : g
                ) || []
            }));

            if (msg.includes('current date')) {
                alert(msg);
            } else {
                console.error('Error updating monthly goal completion:', JSON.stringify(error, null, 2));
            }
        }
    };

    const updateGoalTitle = async (monthKey: string, goalId: string, newTitle: string) => {
        if (!user) return;

        // Optimistic update
        setGoals(prev => ({
            ...prev,
            [monthKey]: prev[monthKey]?.map(g =>
                g.id === goalId ? { ...g, title: newTitle } : g
            ) || []
        }));

        try {
            const [year, month] = monthKey.split('-').map(Number);

            // Find the monthly goal first to get its DB ID
            const { data: monthlyGoal } = await supabase
                .from('monthly_goals')
                .select('id')
                .eq('user_id', user.id)
                .eq('year', year)
                .eq('month', month)
                .eq('goal_id', goalId)
                .single();

            if (monthlyGoal) {
                // Update existing
                const { error } = await supabase
                    .from('monthly_goals')
                    .update({ title: newTitle })
                    .eq('id', monthlyGoal.id);

                if (error) throw error;
            } else {
                console.warn('Goal not found in DB for update, it might be new.');
            }
        } catch (error) {
            console.error('Error updating monthly goal title:', error);
        }
    };

    return {
        goals,
        loading,
        user,
        saveGoals,
        updateGoalCompletion,
        updateGoalTitle,
        refreshGoals: loadGoals
    };
}
