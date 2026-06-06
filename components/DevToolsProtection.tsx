'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DevToolsProtection = () => {
  const router = useRouter();

  useEffect(() => {
    const redirectUnauthorised = () => {
      if (typeof window !== 'undefined') {
        window.location.href = '/unauthorised';
      }
    };

    // 1. Context Menu (Right Click) Prevention
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Keyboard Shortcuts Prevention
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        redirectUnauthorised();
      }
      // Ctrl + Shift + I/J/C
      if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
        e.preventDefault();
        redirectUnauthorised();
      }
      // Ctrl + U (View Source)
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        redirectUnauthorised();
      }
    };

    // 3. Debugger Loop (Most effective way to break DevTools experience)
    const debuggerInterval = setInterval(() => {
      const startTime = performance.now();
      debugger;
      const endTime = performance.now();
      if (endTime - startTime > 100) {
        redirectUnauthorised();
      }
    }, 1000);

    // 4. Console Detection (Image ID trick)
    const element = new Image();
    Object.defineProperty(element, 'id', {
      get: function () {
        redirectUnauthorised();
      },
    });

    const checkDevTools = setInterval(() => {
      console.log(element);
      console.clear();
    }, 500);

    // 5. Window Dimension Check
    const threshold = 160;
    const checkDimensions = setInterval(() => {
      if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
        redirectUnauthorised();
      }
    }, 500);

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(debuggerInterval);
      clearInterval(checkDevTools);
      clearInterval(checkDimensions);
    };
  }, []);

  return null;
};

export default DevToolsProtection;
