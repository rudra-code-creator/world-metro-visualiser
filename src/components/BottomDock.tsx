import { useCallback, useRef, type ReactNode } from 'react';

export type BottomDockTab = {
  id: string;
  label: string;
  hint?: string;
  panel: ReactNode;
};

const DOCK_MIN_HEIGHT_PX = 140;
const DOCK_MAX_HEIGHT_RATIO = 0.85;

export function clampDockHeight(heightPx: number): number {
  const maxHeight = Math.round(window.innerHeight * DOCK_MAX_HEIGHT_RATIO);
  return Math.max(DOCK_MIN_HEIGHT_PX, Math.min(maxHeight, heightPx));
}

export function getDefaultDockHeight(): number {
  return clampDockHeight(Math.round(window.innerHeight * 0.25));
}

type BottomDockProps = {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  activeTabId: string;
  onActiveTabChange: (tabId: string) => void;
  height: number;
  onHeightChange: (height: number) => void;
  onResizingChange?: (resizing: boolean) => void;
  tabs: BottomDockTab[];
};

export function BottomDock({
  expanded,
  onExpandedChange,
  activeTabId,
  onActiveTabChange,
  height,
  onHeightChange,
  onResizingChange,
  tabs,
}: BottomDockProps) {
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const selectTab = (tabId: string, expand = false) => {
    onActiveTabChange(tabId);
    if (expand) onExpandedChange(true);
  };

  const endResize = useCallback(
    (target: EventTarget | null, pointerId: number) => {
      resizeRef.current = null;
      onResizingChange?.(false);
      if (target instanceof HTMLElement && target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    },
    [onResizingChange],
  );

  const handleResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeRef.current = { startY: event.clientY, startHeight: height };
    onResizingChange?.(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current) return;
    const deltaY = resizeRef.current.startY - event.clientY;
    onHeightChange(clampDockHeight(resizeRef.current.startHeight + deltaY));
  };

  const handleResizePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    endResize(event.currentTarget, event.pointerId);
  };

  const handleResizePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    endResize(event.currentTarget, event.pointerId);
  };

  if (!expanded) {
    return (
      <div className="bottom-dock bottom-dock--minimized">
        <div className="bottom-dock__minimized-tabs" role="tablist" aria-label="Bottom panels">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`bottom-dock__minimized-tab${isActive ? ' bottom-dock__minimized-tab--active' : ''}`}
                onClick={() => selectTab(tab.id, true)}
                aria-label={`Expand ${tab.label}`}
              >
                <span className="bottom-dock__tab-chevron" aria-hidden>
                  ▲
                </span>
                <span className="bottom-dock__tab-title">{tab.label}</span>
                {tab.hint && isActive ? (
                  <span className="bottom-dock__tab-hint">{tab.hint}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bottom-dock bottom-dock--expanded">
      <div
        className="bottom-dock__resize-handle"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize bottom panel"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerCancel}
      />
      <div className="bottom-dock__header">
        <div className="bottom-dock__tabs" role="tablist" aria-label="Bottom panels">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`bottom-dock__tab-btn${isActive ? ' bottom-dock__tab-btn--active' : ''}`}
                onClick={() => selectTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="bottom-dock__minimize"
          onClick={() => onExpandedChange(false)}
          aria-label="Minimize panel"
          title="Minimize"
        >
          <span aria-hidden>▼</span>
        </button>
      </div>
      <div
        className="bottom-dock__content"
        role="tabpanel"
        aria-label={activeTab?.label}
      >
        {activeTab?.panel}
      </div>
    </div>
  );
}
