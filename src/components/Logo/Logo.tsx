import React from 'react';
import Image from 'next/image';
import styles from './Logo.module.css';

interface LogoProps {
    size?: 'small' | 'medium' | 'large';
    showText?: boolean;
    className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = true, className = '' }) => {
    // Map abstract sizes to pixel dimensions
    const pxSize = size === 'small' ? 32 : size === 'medium' ? 40 : 64;

    return (
        <div className={`${styles.logoContainer} ${styles[size]} ${className}`}>
            <Image
                src="/logo-rounded.png"
                alt="Ābhyāsa"
                width={pxSize}
                height={pxSize}
                className={styles.logoImage}
            />
            {showText && <span className={styles.logoText}>Ābhyāsa</span>}
        </div>
    );
};

export default Logo;
