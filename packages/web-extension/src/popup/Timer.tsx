import { useEffect, useState } from 'react';
import { Stat, StatNumber } from '@chakra-ui/react';
import { formatTime } from '~/utils';

export function Timer({
  startTime,
  ticking,
}: {
  startTime: number;
  ticking: boolean;
}) {
  const [time, setTime] = useState(Date.now() - startTime);
  useEffect(() => {
    if (!ticking) return;
    const interval = setInterval(() => {
      setTime(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, ticking]);
  return (
    <Stat textAlign="center" mt={4}>
      <StatNumber fontSize="3xl">{formatTime(time)}</StatNumber>
    </Stat>
  );
}
