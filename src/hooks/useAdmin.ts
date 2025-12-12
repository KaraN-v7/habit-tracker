import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useAdmin() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Check if user is admin
    const { data: isAdmin = false, isLoading } = useQuery({
        queryKey: ['isAdmin', user?.id],
        queryFn: async () => {
            if (!user) return false;
            const { data, error } = await supabase.rpc('is_admin');
            if (error) {
                console.error('Error checking admin status:', error);
                return false;
            }
            return !!data;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 30, // Check every 30 mins
    });

    const addAdminMutation = useMutation({
        mutationFn: async (targetUserId: string) => {
            const { error } = await supabase.rpc('add_admin_by_id', { target_user_id: targetUserId });
            if (error) throw error;
        }
    });

    const resetAllPointsMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('admin_reset_all_points');
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
            alert('All points have been reset successfully.');
        }
    });

    return {
        isAdmin,
        isLoading,
        addAdmin: addAdminMutation.mutateAsync,
        resetAllPoints: resetAllPointsMutation.mutateAsync
    };
}
