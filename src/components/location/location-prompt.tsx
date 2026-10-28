import { LocateFixed, Search } from "lucide-react";

import styles from "../experience.module.css";

export function LocationPrompt({ state, onLocate, onSearch }: {
  state: "permission" | "denied" | "unavailable";
  onLocate: () => void;
  onSearch: () => void;
}) {
  const message = state === "permission"
    ? "允许定位后，我们只用这次坐标查找 1 公里内的奶茶、饮品和咖啡店。"
    : state === "denied"
      ? "没有定位权限也没关系，可以直接搜索你所在的商场或地点。"
      : "当前设备无法定位，可以改用上海地点搜索。";
  return (
    <main className={styles.centered}>
      <section className={styles.panel}>
        <h1>奶茶地图</h1>
        <p>{message}</p>
        <div className={styles.actions}>
          <button type="button" className={`${styles.primary} ${styles.actionControl}`} onClick={onLocate}>
            <span className={styles.actionIcon} aria-hidden="true"><LocateFixed size={18} /></span>
            <span className={styles.actionLabel}>使用我的位置</span>
            <span className={styles.actionSpacer} aria-hidden="true" />
          </button>
          <button type="button" className={`${styles.secondary} ${styles.actionControl}`} onClick={onSearch}>
            <span className={styles.actionIcon} aria-hidden="true"><Search size={18} /></span>
            <span className={styles.actionLabel}>搜索商场或地点</span>
            <span className={styles.actionSpacer} aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  );
}
