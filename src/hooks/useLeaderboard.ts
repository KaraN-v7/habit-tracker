import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface LeaderboardEntry {
    user_id: string;
    display_name: string;
    avatar_url: string;
    total_points: number;
    rank: number;
}

export interface UserDetails {
    goals_completed: number;
    chapters_completed: number;
    subjects_completed: number;
    study_hours: number;
    total_points: number;
    syllabus_total: number;
    syllabus_completed: number;
    syllabus_percentage: number;
}

export type Period = 'daily' | 'weekly' | 'monthly';

export function useLeaderboard() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [userPoints, setUserPoints] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // State for navigation
    const [currentDate, setCurrentDate] = useState(new Date());
    const [period, setPeriod] = useState<Period>('daily');

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setCurrentUser(user);
        });
    }, []);

    const getTimeRange = (date: Date, type: Period) => {
        const start = new Date(date);
        const end = new Date(date);

        if (type === 'daily') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (type === 'weekly') {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);

            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (type === 'monthly') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);

            end.setMonth(start.getMonth() + 1);
            end.setDate(0); // Last day of previous month (which is current month)
            end.setHours(23, 59, 59, 999);
        }

        return { start, end };
    };

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const { start, end } = getTimeRange(currentDate, period);

            const { data, error } = await supabase
                .rpc('get_period_leaderboard', {
                    start_time: start.toISOString(),
                    end_time: end.toISOString()
                });

            if (error) throw error;
            setLeaderboard(data || []);

            // Update current user points from the list if available
            if (currentUser) {
                const myEntry = data?.find((e: any) => e.user_id === currentUser.id);
                setUserPoints(myEntry ? myEntry.total_points : 0);
            }
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserDetails = async (userId: string): Promise<UserDetails | null> => {
        try {
            const { start, end } = getTimeRange(currentDate, period);

            // 1. Get Period Stats
            const { data: periodStats, error: statsError } = await supabase
                .rpc('get_user_period_details', {
                    target_user_id: userId,
                    start_time: start.toISOString(),
                    end_time: end.toISOString()
                })
                .single();

            if (statsError) throw statsError;

            // 2. Get Syllabus Stats (All Time)
            const { data: syllabusStats, error: syllabusError } = await supabase
                .rpc('get_user_syllabus_progress', {
                    target_user_id: userId
                })
                .single();

            if (syllabusError) throw syllabusError;

            return {
                ...(periodStats as any),
                syllabus_total: (syllabusStats as any).total_chapters,
                syllabus_completed: (syllabusStats as any).completed_chapters,
                syllabus_percentage: (syllabusStats as any).percentage
            };
        } catch (error) {
            console.error('Error fetching user details:', error);
            return null;
        }
    };

    useEffect(() => {
        fetchLeaderboard();

        // Debounce timer for real-time updates
        let debounceTimer: NodeJS.Timeout | null = null;

        const debouncedRefresh = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchLeaderboard();
            }, 1000); // Wait 1 second before refreshing
        };

        // Subscribe to profile changes AND points_history changes to refresh leaderboard in real-time
        const channel = supabase
            .channel('leaderboard_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles'
                },
                debouncedRefresh
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'points_history'
                },
                debouncedRefresh
            )
            .subscribe();

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, [currentUser, currentDate, period]);

    const resetProgress = async (resetPeriod: 'today' | 'week' | 'month') => {
        try {
            const { error } = await supabase.rpc('reset_my_progress', { period: resetPeriod });
            if (error) throw error;
            fetchLeaderboard(); // Refresh immediately
        } catch (error) {
            console.error('Error resetting progress:', error);
            alert('Failed to reset progress.');
        }
    };

    return {
        leaderboard,
        userPoints,
        loading,
        refresh: fetchLeaderboard,
        currentUser,
        currentDate,
        setCurrentDate,
        period,
        setPeriod,
        fetchUserDetails,
        resetProgress
    };
}
