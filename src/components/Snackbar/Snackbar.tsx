'use client';

import React, { useEffect, useState } from 'react';
import styles from './Snackbar.module.css';

interface SnackbarProps {
    message: string;
    isVisible: boolean;
    onUndo?: () => void;
    onClose?: () => void;
    duration?: number;
}

const Snackbar: React.FC<SnackbarProps> = ({ message, isVisible, onUndo, onClose, duration = 5000 }) => {
    const [show, setShow] = useState(isVisible);

    useEffect(() => {
        setShow(isVisible);
        if (isVisible && onClose) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!show && !isVisible) return null;

    return (
        <div className={`${styles.snackbar} ${show ? styles.visible : ''}`}>
            <span className={styles.message}>{message}</span>
            {onUndo && (
                <button
                    onClick={() => {
                        onUndo();
                        if (onClose) onClose();
                    }}
                    className={styles.undoBtn}
                >
                    UNDO
                </button>
            )}
        </div>
    );
};

export default Snackbar;
