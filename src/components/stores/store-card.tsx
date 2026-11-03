import type { StoreSummary } from "@/features/nearby/contracts";

import styles from "../map/map-ui.module.css";
import { CopyBrandButton } from "./copy-brand-button";

const CATEGORY_GLYPH = { tea_drink: "茶", coffee: "咖", beverage: "饮" } as const;

export function StoreCard({
  store,
  index,
  selected,
  onSelect,
}: {
  store: StoreSummary;
  index: string;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <article
      id={`store-${store.id}`}
      className={styles.storeCard}
      data-category={store.category}
      data-selected={selected || undefined}
      aria-label={`${store.name}门店信息`}
    >
      <button
        type="button"
        className={styles.storeSelect}
        aria-label={`选择${store.name}`}
        aria-pressed={selected}
        onClick={() => onSelect(store.id)}
      >
        <span className={styles.storeIndex}>{index}</span>
        <span className={styles.categoryTile} data-category={store.category} aria-hidden="true">
          {CATEGORY_GLYPH[store.category]}
        </span>
        <span className={styles.storeCopy}>
          <span className={styles.storeNameLine}>
            <strong>{store.name}</strong>
            {store.branchName ? <span className={styles.branch}>{store.branchName}</span> : null}
          </span>
          <span className={styles.storeMeta}>
            <span>{store.mallId ? "商场内" : "周边街铺"}</span>
            <span className={styles.metaDot} aria-hidden="true" />
            <span className={styles.distance}>约 {store.distanceM}m</span>
          </span>
        </span>
      </button>
      <CopyBrandButton brandName={store.name} />
    </article>
  );
}
