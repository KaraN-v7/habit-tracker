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
            <span className={styles.logoText}>Ābhyāsa</span>
        </div>
    );
};

export default Logo;
