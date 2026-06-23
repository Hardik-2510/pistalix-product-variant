import { useEffect } from 'react';
import { useBlocker } from 'react-router';

export function useUnsavedChanges(isDirty) {
  // Prevent browser refresh or tab close
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = ''; // Required for legacy browsers
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Prevent React Router navigation within the app
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      const confirmLeave = window.confirm("You have unsaved changes. Are you sure you want to leave?");
      if (confirmLeave) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);
}
