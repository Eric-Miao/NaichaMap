import type { StoreGroup } from "@/features/nearby/contracts";
import type { GroupFilter } from "@/features/map/reducer";

import styles from "../map/map-ui.module.css";

export function LocationTabs({
  groups,
  countGroups,
  value,
  onChange,
}: {
  groups: StoreGroup[];
  countGroups: StoreGroup[];
  value: GroupFilter;
  onChange: (filter: GroupFilter) => void;
}) {
  const counts = new Map(countGroups.map((group) => [group.id, group.stores.length]));
  const count = countGroups.reduce((total, group) => total + group.stores.length, 0);
  const tabs = [
    { value: "all", label: "全部地点", count },
    ...groups.map((group) => ({
      value: group.id,
      label: group.kind === "mall" ? group.mall.name : "周边街铺",
      count: counts.get(group.id) ?? 0,
    })),
  ];

  return (
    <div className={`${styles.tabs} ${styles.locationTabs}`} role="tablist" aria-label="地点筛选">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={styles.tab}
          role="tab"
          aria-selected={value === tab.value}
          disabled={tab.count === 0 && value !== tab.value}
          onClick={() => onChange(tab.value)}
        >
          {tab.label} {tab.count}
        </button>
      ))}
    </div>
  );
}
