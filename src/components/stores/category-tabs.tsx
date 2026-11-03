import type { MapFilter } from "@/features/map/reducer";

import styles from "../map/map-ui.module.css";

const TABS: Array<{ value: MapFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "tea_drink", label: "茶饮" },
  { value: "coffee", label: "咖啡" },
];

export function CategoryTabs({
  counts,
  value,
  onChange,
}: {
  counts: Record<MapFilter, number>;
  value: MapFilter;
  onChange: (filter: MapFilter) => void;
}) {
  return (
    <div className={styles.filterBlock}>
      <div className={styles.segmented} role="group" aria-label="品类筛选">
        {TABS.map((tab) => {
          const count = counts[tab.value];
          return (
            <button
              key={tab.value}
              type="button"
              className={styles.segment}
              aria-pressed={value === tab.value}
              disabled={count === 0 && value !== tab.value}
              onClick={() => onChange(tab.value)}
            >
              <span>{tab.label}</span> <span className={styles.count}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
