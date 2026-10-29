import type { StoreGroup } from "@/features/nearby/contracts";
import type { GroupFilter } from "@/features/map/reducer";

import styles from "../map/map-ui.module.css";

export function LocationTabs({
  groups,
  value,
  onChange,
}: {
  groups: StoreGroup[];
  value: GroupFilter;
  onChange: (filter: GroupFilter) => void;
}) {
  const count = groups.reduce((total, group) => total + group.stores.length, 0);
  const tabs = [
    { value: "all", label: "全部地点", count },
    ...groups.map((group) => ({
      value: group.id,
      label: group.kind === "mall" ? group.mall.name : "周边街铺",
      count: group.stores.length,
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
          onClick={() => onChange(tab.value)}
        >
          {tab.label} {tab.count}
        </button>
      ))}
    </div>
  );
}
