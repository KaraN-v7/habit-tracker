import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface LeaderboardEntry {
    user_id: string;
    display_name: string;
    avatar_url: string;
    total_points: number;
    daily_points: number;
    weekly_points: number;
    monthly_points: number;
}

export function useLeaderboard() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [userPoints, setUserPoints] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setCurrentUser(user);
        });
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const { data, error } = await supabase
                .from('leaderboard_stats')
                .select('*');

            if (error) throw error;
            setLeaderboard(data || []);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserPoints = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('leaderboard_stats')
            .select('total_points')
            .eq('user_id', user.id)
            .single();

        if (data) {
            setUserPoints(data.total_points);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
        fetchUserPoints();
    }, [currentUser]);

    return { leaderboard, userPoints, loading, refresh: fetchLeaderboard, currentUser };
}
