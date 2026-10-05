import React, { useEffect } from 'react';
import { useUiStore } from '../../stores/ui.store';
import { FeedbackDialog } from './FeedbackDialog';

export const FeedbackModalHost: React.FC = () => {
  const current = useUiStore((state) => state.feedbackQueue[0]);
  const dismissFeedback = useUiStore((state) => state.dismissFeedback);

  useEffect(() => {
    if (!current || current.durationMs === null) return;
    const timeout = window.setTimeout(() => dismissFeedback(current.id), current.durationMs);
    return () => window.clearTimeout(timeout);
  }, [current, dismissFeedback]);

  if (!current) return null;
  return <FeedbackDialog key={current.id} item={current} onClose={() => dismissFeedback(current.id)} />;
};
