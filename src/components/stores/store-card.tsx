import type { StoreSummary } from "@/features/nearby/contracts";

import styles from "../map/map-ui.module.css";
import { CopyBrandButton } from "./copy-brand-button";

export function StoreCard({
  store,
  selected,
  onSelect,
}: {
  store: StoreSummary;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const displayName = store.branchName ? `${store.name} · ${store.branchName}` : store.name;
  return (
    <article className={styles.storeCard} data-selected={selected || undefined}>
      <button
        type="button"
        className={styles.storeSelect}
        aria-label={`选择${store.name}`}
        aria-pressed={selected}
        onClick={() => onSelect(store.id)}
      >
        <span className={styles.brandTile} aria-hidden="true">
          {store.name.slice(0, 1).toLocaleUpperCase()}
        </span>
        <span className={styles.storeCopy}>
          <strong>{displayName}</strong>
          <span>{store.mallId ? "商场内" : "周边街铺"} · 约 {store.distanceM}m</span>
        </span>
      </button>
      <CopyBrandButton brandName={store.name} />
    </article>
  );
}
