'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the main app component to avoid SSR issues
const MainApp = dynamic(() => import('@/components/MainApp'), { ssr: false });

export default function Home() {
  return <MainApp />;
}
