export interface PlayerControlsProps {
  onPrevious?: () => void;
  onReplay?: () => void;
  onNext?: () => void;
  onSaveProgress?: () => void;
  disabled?: boolean;
}

export function PlayerControls({ disabled, onNext, onPrevious, onReplay, onSaveProgress }: PlayerControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="rounded border border-line bg-white px-3 py-2 text-sm disabled:opacity-50" type="button" onClick={onPrevious} disabled={disabled}>
        上一句
      </button>
      <button className="rounded border border-line bg-white px-3 py-2 text-sm disabled:opacity-50" type="button" onClick={onReplay} disabled={disabled}>
        重播
      </button>
      <button className="rounded border border-line bg-white px-3 py-2 text-sm disabled:opacity-50" type="button" onClick={onNext} disabled={disabled}>
        下一句
      </button>
      <button className="rounded border border-line bg-white px-3 py-2 text-sm disabled:opacity-50" type="button" onClick={onSaveProgress} disabled={disabled}>
        保存进度
      </button>
    </div>
  );
}
