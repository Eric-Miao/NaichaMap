import type { StoreGroup as StoreGroupType } from "@/features/nearby/contracts";

import styles from "../map/map-ui.module.css";
import { StoreCard } from "./store-card";

export function StoreGroup({
  group,
  selectedId,
  onSelectGroup,
  onSelectStore,
}: {
  group: StoreGroupType;
  selectedId: string | null;
  onSelectGroup: (id: string) => void;
  onSelectStore: (id: string) => void;
}) {
  const name = group.kind === "mall" ? group.mall.name : "周边街铺";
  return (
    <section className={styles.group} id={`group-${group.id}`}>
      <button
        type="button"
        className={styles.groupHeader}
        aria-label={`查看${name}门店`}
        onClick={() => onSelectGroup(group.id)}
      >
        <strong>{name}</strong>
        <span>{group.stores.length} 家</span>
      </button>
      {group.stores.map((store) => (
        <StoreCard
          key={store.id}
          store={store}
          selected={selectedId === store.id}
          onSelect={onSelectStore}
        />
      ))}
    </section>
  );
}
