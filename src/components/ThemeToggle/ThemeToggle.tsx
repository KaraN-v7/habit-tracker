"use client";

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './ThemeToggle.module.css';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={styles.toggleButton}
            aria-label="Toggle Dark Mode"
            title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
    );
};

export default ThemeToggle;
