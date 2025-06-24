'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box } from '@mui/material';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/casino');
  }, [router]);

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '18px'
    }}>
      Redirecting to Casino...
    </Box>
  );
}
