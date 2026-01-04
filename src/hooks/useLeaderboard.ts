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
    longest_streak: number;
}

export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'overall';

export function useLeaderboard() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [userPoints, setUserPoints] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // State for navigation
    const [currentDate, setCurrentDate] = useState(new Date());
    const [period, setPeriod] = useState<Period>('overall');

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
        } else if (type === 'yearly') {
            start.setMonth(0, 1); // January 1st
            start.setHours(0, 0, 0, 0);

            end.setMonth(11, 31); // December 31st
            end.setHours(23, 59, 59, 999);
        } else if (type === 'overall') {
            start.setFullYear(2026, 0, 1);
            end.setFullYear(2100, 11, 31);
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
                .maybeSingle();

            if (statsError) {
                console.error('Stats Error:', JSON.stringify(statsError, null, 2));
                // Don't throw, just default to empty
            }

            // 2. Get Syllabus Stats (All Time)
            const { data: syllabusStats, error: syllabusError } = await supabase
                .rpc('get_user_syllabus_progress', {
                    target_user_id: userId
                })
                .maybeSingle();

            if (syllabusError) {
                console.error('Syllabus Error:', syllabusError);
            }

            // Default values in case of missing data
            const safePeriodStats = periodStats || {
                goals_completed: 0,
                chapters_completed: 0,
                subjects_completed: 0,
                study_hours: 0,
                total_points: 0,
                longest_streak: 0
            };

            const safeSyllabusStats = syllabusStats || {
                total_chapters: 0,
                completed_chapters: 0,
                percentage: 0
            };

            return {
                goals_completed: (safePeriodStats as any).goals_completed ?? 0,
                chapters_completed: (safePeriodStats as any).chapters_completed ?? 0,
                subjects_completed: (safePeriodStats as any).subjects_completed ?? 0,
                study_hours: (safePeriodStats as any).study_hours ?? 0,
                total_points: (safePeriodStats as any).total_points ?? 0,
                longest_streak: (safePeriodStats as any).longest_streak ?? 0,
                syllabus_total: (safeSyllabusStats as any).total_chapters ?? 0,
                syllabus_completed: (safeSyllabusStats as any).completed_chapters ?? 0,
                syllabus_percentage: (safeSyllabusStats as any).percentage ?? 0
            };
        } catch (error) {
            console.error('Error fetching user details:', JSON.stringify(error, null, 2));
            return null;
        }
    };

    useEffect(() => {
        fetchLeaderboard();

        if (!currentUser) return;

        // Debounce timer for real-time updates
        let debounceTimer: NodeJS.Timeout | null = null;

        const debouncedRefresh = (payload: any) => {
            console.log('Realtime Update Received:', payload);
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                console.log('Refetching Leaderboard due to update...');
                fetchLeaderboard();
            }, 1000); // Wait 1 second before refreshing
        };

        // Unique channel name to prevent conflicts between multiple hook instances (Sidebar/Navbar)
        const channelId = `leaderboard_updates_${currentUser.id}_${Math.random().toString(36).substr(2, 9)}`;

        // Subscribe to profile changes AND points_history changes
        const channel = supabase
            .channel(channelId)
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
                    event: 'INSERT', // Points are mainly INSERTs. We can listen to all, but INSERT is key.
                    schema: 'public',
                    table: 'points_history',
                    filter: `user_id=eq.${currentUser.id}` // Only listen to MY points to reduce noise
                },
                debouncedRefresh
            )
            .subscribe((status) => {
                console.log(`Subscription status for ${channelId}:`, status);
            });

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            console.log(`Unsubscribing from ${channelId}`);
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
