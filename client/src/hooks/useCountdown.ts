'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function useCountdown(endAt: number | null) {
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!endAt) {
      setRemaining(0);
      return;
    }

    const update = () => {
      const diff = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(diff);
      if (diff <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    update();
    intervalRef.current = setInterval(update, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [endAt]);

  return remaining;
}
