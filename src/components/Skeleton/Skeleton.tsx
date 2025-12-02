import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
    width?: string;
    height?: string;
    borderRadius?: string;
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = '20px',
    borderRadius = '4px',
    className = ''
}) => {
    return (
        <div
            className={`${styles.skeleton} ${className}`}
            style={{ width, height, borderRadius }}
        />
    );
};

export const SkeletonBlock: React.FC = () => {
    return (
        <div className={styles.skeletonBlock}>
            <Skeleton width="20px" height="20px" borderRadius="3px" />
            <Skeleton width="100%" height="24px" />
        </div>
    );
};

export const SkeletonGoalsList: React.FC<{ count?: number }> = ({ count = 5 }) => {
    return (
        <div className={styles.skeletonList}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonBlock key={i} />
            ))}
        </div>
    );
};

export const SkeletonHeader: React.FC = () => {
    return (
        <div className={styles.skeletonHeader}>
            <div className={styles.skeletonDateNav}>
                <Skeleton width="40px" height="40px" borderRadius="8px" />
                <Skeleton width="300px" height="40px" />
                <Skeleton width="40px" height="40px" borderRadius="8px" />
            </div>
            <Skeleton width="150px" height="24px" className={styles.skeletonSubHeader} />
        </div>
    );
};

export const SkeletonCard: React.FC = () => {
    return (
        <div className={styles.skeletonCard}>
            <Skeleton width="60%" height="24px" />
            <Skeleton width="40%" height="20px" />
        </div>
    );
};

export const SkeletonChartCard: React.FC = () => {
    return (
        <div className={styles.skeletonChartCard}>
            <Skeleton width="50%" height="24px" />
            <Skeleton width="100%" height="200px" borderRadius="8px" className={styles.skeletonChart} />
        </div>
    );
};
