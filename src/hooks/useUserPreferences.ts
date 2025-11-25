import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type Theme = 'light' | 'dark';

export function useUserPreferences() {
    const [theme, setTheme] = useState<Theme>('dark');
    const [loading, setLoading] = useState(true);
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

    // Load preferences from Supabase
    useEffect(() => {
        if (!user) {
            // If not logged in, use localStorage as fallback
            const savedTheme = localStorage.getItem('theme') as Theme;
            if (savedTheme) {
                setTheme(savedTheme);
            }
            setLoading(false);
            return;
        }

        loadPreferences();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('user_preferences_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_preferences',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    loadPreferences();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const loadPreferences = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
                throw error;
            }

            if (data) {
                setTheme(data.theme as Theme);
            } else {
                // Create initial preferences
                await initializePreferences();
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
            // Fallback to localStorage if Supabase fails
            const savedTheme = localStorage.getItem('theme') as Theme;
            if (savedTheme) {
                setTheme(savedTheme);
            }
        } finally {
            setLoading(false);
        }
    };

    const initializePreferences = async () => {
        if (!user) {
            console.warn('Cannot initialize preferences: User not authenticated');
            return;
        }

        try {
            // Check localStorage for existing theme preference
            const savedTheme = localStorage.getItem('theme') as Theme;
            const initialTheme = savedTheme || 'dark';

            const { error } = await supabase
                .from('user_preferences')
                .insert({
                    user_id: user.id,
                    theme: initialTheme
                });

            if (error) {
                // If error is duplicate key, ignore it (user preferences already exist)
                if (error.code === '23505') {
                    console.log('User preferences already exist');
                    return;
                }
                throw error;
            }

            setTheme(initialTheme);
        } catch (error) {
            console.error('Error initializing preferences:', error);
            // Fallback to localStorage
            const savedTheme = localStorage.getItem('theme') as Theme;
            if (savedTheme) {
                setTheme(savedTheme);
            }
        }
    };

    const updateTheme = async (newTheme: Theme) => {
        if (!user) {
            // If not logged in, use localStorage
            localStorage.setItem('theme', newTheme);
            setTheme(newTheme);
            return;
        }

        try {
            const { error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: user.id,
                    theme: newTheme
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;

            setTheme(newTheme);

            // Also update localStorage for consistency
            localStorage.setItem('theme', newTheme);
        } catch (error) {
            console.error('Error updating theme:', error);
        }
    };

    return {
        theme,
        loading,
        user,
        updateTheme,
        refreshPreferences: loadPreferences
    };
}
