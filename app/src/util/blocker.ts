import { useEffect, useState } from "react";
import { useBlocker } from "react-router-dom"; // Or your routing library

type UsePopupBlockerParams = {
  shouldBlock: boolean;
  onConfirm?: () => Promise<void>;
  onCancel?: () => Promise<void>;
};

/**
 * Hook to block navigation and state to show a custom popup for confirmation.
 */
export function usePopupBlocker({ shouldBlock, onConfirm, onCancel }: UsePopupBlockerParams) {
  const [showPopup, setShowPopup] = useState(false);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (shouldBlock && currentLocation.pathname !== nextLocation.pathname) {
      setShowPopup(true);
      return true;
    }
    return false;
  });

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (shouldBlock) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldBlock]);

  // Handle user decisions
  const handleConfirm = async () => {
    if (onConfirm) await onConfirm();
    if (blocker.proceed) blocker.proceed();
    setShowPopup(false);
  };

  const handleCancel = async () => {
    if (onCancel) await onCancel();
    if (blocker.proceed) blocker.proceed();
    setShowPopup(false);
  };

  return { showPopup, setShowPopup, handleConfirm, handleCancel };
}
