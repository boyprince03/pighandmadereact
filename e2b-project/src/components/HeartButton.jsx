// /src/components/HeartButton.jsx
import React, { useState } from 'react';

/**
 * 漂亮愛心按鈕（Material Symbols Rounded）
 * props:
 * - active: 是否為已收藏（實心）
 * - onToggle: 點擊切換 callback
 * - size: 'sm' | 'md' | 'lg'（圓形按鈕尺寸）
 * - className: 額外 class
 * - ariaLabel: 無障礙描述
 * - nudgeY: 圖示垂直微調（px），預設 1；若你覺得還高/低，可改 0 或 2
 */
export default function HeartButton({
  active = false,
  onToggle,
  size = 'md',
  className = '',
  ariaLabel,
  nudgeY = 3,
}) {
  const [pop, setPop] = useState(false);

  const sizeMap = {
    sm: 'w-8 h-8 text-[20px]',   // 32px 圓，20px 圖示
    md: 'w-10 h-10 text-[22px]', // 40px 圓，22px 圖示
    lg: 'w-12 h-12 text-[26px]', // 48px 圓，26px 圖示
  };
  const btnSize = sizeMap[size] || sizeMap.md;

  return (
    <button
      type="button"
      aria-label={ariaLabel || (active ? '移除我的最愛' : '加入我的最愛')}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        setPop(true);
        onToggle?.();
        setTimeout(() => setPop(false), 200);
      }}
      className={[
        // 用 grid + place-items-center 讓內容幾何置中
        'grid place-items-center rounded-full ring-1 ring-black/5 shadow-sm transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300',
        active ? 'bg-rose-600 text-white' : 'bg-white text-gray-700 hover:text-rose-600',
        btnSize,
        pop ? 'heart-pop' : '',
        className,
      ].join(' ')}
      // 把填滿狀態丟到 CSS 變數，交給 .material-symbols-rounded 的 FILL 軸使用
      style={{ ['--symbol-fill']: active ? 1 : 0 }}
    >
      {/* 圖示本體：leading-none 避免額外行高；translateY 做 1px 微下修 */}
      <span
        className="material-symbols-rounded leading-none"
        style={{ transform: `translateY(${nudgeY}px)` }}
      >
        favorite
      </span>
    </button>
  );
}
