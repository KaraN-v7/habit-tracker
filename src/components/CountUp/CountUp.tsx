import React, { useEffect, useState, useRef } from 'react';

interface CountUpProps {
    end: number;
    duration?: number;
    className?: string;
}

const CountUp: React.FC<CountUpProps> = ({ end, duration = 1000, className }) => {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const startTimeRef = useRef<number | null>(null);
    const startValueRef = useRef(0);

    useEffect(() => {
        startValueRef.current = countRef.current;
        startTimeRef.current = null;

        let animationFrameId: number;

        const animate = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const progress = timestamp - startTimeRef.current;
            const percentage = Math.min(progress / duration, 1);

            // Ease out quart
            const ease = 1 - Math.pow(1 - percentage, 4);

            const nextCount = Math.floor(startValueRef.current + (end - startValueRef.current) * ease);

            setCount(nextCount);
            countRef.current = nextCount;

            if (percentage < 1) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                setCount(end); // Ensure we land exactly on the target
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, [end, duration]);

    return <span className={className}>{count}</span>;
};

export default CountUp;
