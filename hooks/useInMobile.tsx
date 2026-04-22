import { useState, useEffect } from 'react';

const useIsMobile = (breakpoint: number = 768): boolean => {
  // State to track if the device is mobile
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Create a media query to monitor screen width
    if(typeof window !== 'undefined'){

    
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const handleResize = () => {
      setIsMobile(mediaQuery.matches);
    };

    // Attach the listener
    mediaQuery.addEventListener('change', handleResize);

    // Initial check
    handleResize();
  

    // Cleanup listener on unmount
    return () => {
      mediaQuery.removeEventListener('change', handleResize);
    };
  }
  }, [breakpoint]);

  return isMobile;
};

export default useIsMobile;
