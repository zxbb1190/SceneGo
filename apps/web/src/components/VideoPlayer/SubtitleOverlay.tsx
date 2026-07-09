export interface SubtitleOverlayProps {
  text?: string;
}

export function SubtitleOverlay({ text }: SubtitleOverlayProps) {
  if (!text) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6">
      <p className="max-w-3xl rounded bg-black/75 px-4 py-2 text-center text-base font-medium text-white">
        {text}
      </p>
    </div>
  );
}

