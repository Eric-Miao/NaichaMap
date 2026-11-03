import type { GroupFilter } from "@/features/map/reducer";

import styles from "../map/map-ui.module.css";

export function LocationTabs({
  options,
  total,
  value,
  onChange,
}: {
  options: Array<{ id: string; label: string; count: number }>;
  total: number;
  value: GroupFilter;
  onChange: (filter: GroupFilter) => void;
}) {
  const tabs = [{ id: "all", label: "全部地点", count: total }, ...options];

  return (
    <div className={styles.filterBlock}>
      <div className={styles.tabs} role="group" aria-label="地点筛选">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={styles.tab}
            aria-pressed={value === tab.id}
            disabled={tab.count === 0 && value !== tab.id}
            onClick={() => onChange(tab.id)}
          >
            <span>{tab.label}</span> <span className={styles.count}>{tab.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
