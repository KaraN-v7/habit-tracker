import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface WeeklyGoal {
    id: string;
    title: string;
    completedDays: { [date: string]: boolean };
}

export interface WeeklyGoalsData {
    [weekKey: string]: WeeklyGoal[];
}

export function useWeeklyGoals() {
    const [goals, setGoals] = useState<WeeklyGoalsData>({});
    const [loading, setLoading] = useState(true); // Start true for instant skeleton render
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
        // Uncomment if you need cross-device real-time sync
        /*
        const goalsChannel = supabase
            .channel('weekly_goals_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'weekly_goals',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    loadGoals();
                }
            )
            .subscribe();

        const completionsChannel = supabase
            .channel('weekly_completions_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'weekly_goal_completions'
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
            // Load weekly goals
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

            // Transform to app format
            const goalsMap: WeeklyGoalsData = {};
            goalsData?.forEach((goal: any) => {
                const weekKey = goal.week_start;
                if (!goalsMap[weekKey]) {
                    goalsMap[weekKey] = [];
                }

                // Build completedDays map
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

            setGoals(goalsMap);
        } catch (error) {
            console.error('Error loading weekly goals:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveGoals = async (weekKey: string, weeklyGoals: WeeklyGoal[]) => {
        if (!user) return;

        try {
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

                // Insert completions
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

            // Update local state
            setGoals(prev => ({
                ...prev,
                [weekKey]: weeklyGoals
            }));
        } catch (error) {
            console.error('Error saving weekly goals:', error);
        }
    };

    const updateGoalCompletion = async (weekKey: string, goalId: string, date: string, completed: boolean) => {
        if (!user) return;

        // Store previous state for potential revert
        const previousState = goals[weekKey]?.find(g => g.id === goalId)?.completedDays?.[date];

        // Optimistic update
        setGoals(prev => ({
            ...prev,
            [weekKey]: prev[weekKey]?.map(g =>
                g.id === goalId
                    ? { ...g, completedDays: { ...g.completedDays, [date]: completed } }
                    : g
            ) || []
        }));

        try {
            // Find the weekly goal
            const { data: weeklyGoal, error: findError } = await supabase
                .from('weekly_goals')
                .select('id')
                .eq('user_id', user.id)
                .eq('week_start', weekKey)
                .eq('goal_id', goalId)
                .single();

            if (findError) throw findError;

            // Upsert completion
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
        } catch (error: any) {
            const msg = error.message || error.details || error.hint || 'Unknown error';
            // Revert the optimistic update
            setGoals(prev => ({
                ...prev,
                [weekKey]: prev[weekKey]?.map(g =>
                    g.id === goalId
                        ? { ...g, completedDays: { ...g.completedDays, [date]: previousState || false } }
                        : g
                ) || []
            }));

            if (msg.includes('current date')) {
                alert(msg);
            } else {
                console.error('Error updating weekly goal completion:', JSON.stringify(error, null, 2));
            }
        }
    };

    const updateGoalTitle = async (weekKey: string, goalId: string, newTitle: string) => {
        if (!user) return;

        // Optimistic update
        setGoals(prev => ({
            ...prev,
            [weekKey]: prev[weekKey]?.map(g =>
                g.id === goalId ? { ...g, title: newTitle } : g
            ) || []
        }));

        try {
            // Find the weekly goal first to get its DB ID
            const { data: weeklyGoal } = await supabase
                .from('weekly_goals')
                .select('id')
                .eq('user_id', user.id)
                .eq('week_start', weekKey)
                .eq('goal_id', goalId)
                .single();

            if (weeklyGoal) {
                // Update existing
                const { error } = await supabase
                    .from('weekly_goals')
                    .update({ title: newTitle })
                    .eq('id', weeklyGoal.id);

                if (error) throw error;
            } else {
                console.warn('Goal not found in DB for update, it might be new.');
            }
        } catch (error) {
            console.error('Error updating weekly goal title:', error);
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
