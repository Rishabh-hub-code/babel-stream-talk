import { useEffect, useState } from 'react';
import { CaptionMessage } from '@/utils/websocket';

interface CaptionOverlayProps {
  captions: CaptionMessage[];
  maxVisible?: number;
}

const CaptionOverlay = ({ captions, maxVisible = 3 }: CaptionOverlayProps) => {
  const [visibleCaptions, setVisibleCaptions] = useState<CaptionMessage[]>([]);

  useEffect(() => {
    setVisibleCaptions(captions.slice(-maxVisible));
  }, [captions, maxVisible]);

  return (
    <div className="absolute bottom-4 left-4 right-4 space-y-2 pointer-events-none">
      {visibleCaptions.map((caption, index) => (
        <div
          key={`${caption.timestamp}-${index}`}
          className="bg-caption-bg/90 backdrop-blur-sm border border-primary/30 rounded-lg p-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-primary">
              {caption.speaker}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(caption.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-sm text-caption-text mb-1">{caption.text}</p>
          {caption.translation && (
            <p className="text-sm text-accent italic">{caption.translation}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default CaptionOverlay;
