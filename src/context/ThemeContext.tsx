"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { useUserPreferences } from '@/hooks/useUserPreferences';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const { theme, updateTheme, loading } = useUserPreferences();

    // Apply theme to document
    useEffect(() => {
        if (!loading) {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }, [theme, loading]);

    const toggleTheme = async () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        await updateTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, loading }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
