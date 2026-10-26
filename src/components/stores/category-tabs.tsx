import type { StoreGroup } from "@/features/nearby/contracts";
import type { MapFilter } from "@/features/map/reducer";

import styles from "../map/map-ui.module.css";

export function CategoryTabs({
  groups,
  value,
  onChange,
}: {
  groups: StoreGroup[];
  value: MapFilter;
  onChange: (filter: MapFilter) => void;
}) {
  const stores = groups.flatMap((group) => group.stores);
  const tabs: Array<{ value: MapFilter; label: string; count: number }> = [
    { value: "all", label: "全部", count: stores.length },
    {
      value: "tea_drink",
      label: "茶饮",
      count: stores.filter((store) => store.category !== "coffee").length,
    },
    { value: "coffee", label: "咖啡", count: stores.filter((store) => store.category === "coffee").length },
  ];

  return (
    <div className={styles.tabs} role="tablist" aria-label="门店分类">
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
