import type { StoreGroup as StoreGroupType } from "@/features/nearby/contracts";
import type { IndexRange } from "@/features/map/selectors";

import styles from "../map/map-ui.module.css";
import { StoreCard } from "./store-card";

export function StoreGroup({
  group,
  range,
  indexes,
  isCurrent,
  selectedId,
  onSelectGroup,
  onSelectStore,
}: {
  group: StoreGroupType;
  range?: IndexRange;
  indexes: Record<string, string>;
  isCurrent: boolean;
  selectedId: string | null;
  onSelectGroup: (id: string) => void;
  onSelectStore: (id: string) => void;
}) {
  const name = group.kind === "mall" ? group.mall.name : "周边街铺";
  const distance = Math.min(...group.stores.map((store) => store.distanceM));

  return (
    <section className={styles.group} id={`group-${group.id}`}>
      <button
        type="button"
        className={styles.groupHeader}
        data-selected={selectedId === group.id || undefined}
        aria-label={`查看${name}门店`}
        onClick={() => onSelectGroup(group.id)}
      >
        <span className={styles.groupIndex}>
          {range ? (range.count > 1 ? `${range.start}–${range.end}` : range.start) : "—"}
        </span>
        <span className={styles.groupName}>
          {name}
          {isCurrent ? <span className={styles.currentChip}>当前</span> : null}
        </span>
        <span className={styles.groupMeta}>
          <span>{group.stores.length} 家</span>
          <span className={styles.groupDistance}>约 {distance}m</span>
        </span>
      </button>
      {group.stores.map((store) => (
        <StoreCard
          key={store.id}
          store={store}
          index={indexes[store.id] ?? "—"}
          selected={selectedId === store.id}
          onSelect={onSelectStore}
        />
      ))}
    </section>
  );
}
