import React from 'react';
import styles from './Logo.module.css';

interface LogoProps {
    size?: 'small' | 'medium' | 'large';
    showText?: boolean;
    className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = true, className = '' }) => {
    return (
        <div className={`${styles.logoContainer} ${styles[size]} ${className}`}>
            <div className={styles.iconWrapper}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.icon}>
                    <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" fillOpacity="0.1" />
                    <path
                        d="M8 12L11 15L16 9"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            {showText && <span className={styles.logoText}>HabitTracker</span>}
        </div>
    );
};

export default Logo;
