import type { RefObject } from "react";
import { SubtitleOverlay } from "./SubtitleOverlay.js";

export interface VideoPlayerProps {
  sourceUrl?: string;
  subtitleText?: string;
  initialPosition?: number;
  videoRef?: RefObject<HTMLVideoElement>;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onPause?: (currentTime: number) => void;
  onPlay?: () => void;
}

export function VideoPlayer({
  sourceUrl,
  subtitleText,
  initialPosition,
  videoRef,
  onDurationChange,
  onPause,
  onPlay,
  onTimeUpdate
}: VideoPlayerProps) {
  return (
    <div className="relative aspect-video overflow-hidden rounded bg-black">
      {sourceUrl ? (
        <video
          ref={videoRef}
          className="h-full w-full"
          controls
          src={sourceUrl}
          onLoadedMetadata={(event) => {
            if (initialPosition && event.currentTarget.currentTime === 0) {
              event.currentTarget.currentTime = initialPosition;
            }

            onDurationChange?.(event.currentTarget.duration);
          }}
          onTimeUpdate={(event) => onTimeUpdate?.(event.currentTarget.currentTime)}
          onPause={(event) => onPause?.(event.currentTarget.currentTime)}
          onPlay={onPlay}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-300">
          选择本地视频后播放
        </div>
      )}
      <SubtitleOverlay text={subtitleText} />
    </div>
  );
}
