import { ArrowRight, LocateFixed, Search } from "lucide-react";

import { NEARBY_RADIUS_LABEL, NEARBY_SCALE_LABEL } from "@/lib/geo/search";

import styles from "../experience.module.css";

const COPY = {
  permission: "允许定位后，只用这次坐标找 500 米内的奶茶、饮品和咖啡店。",
  denied: "没有定位权限也没关系，直接搜索你所在的商场或地点。",
  unavailable: "当前设备无法定位，可以改用上海地点搜索。",
} as const;

function renderCopy(state: keyof typeof COPY) {
  if (state !== "permission") return COPY[state];
  return (
    <>
      允许定位后，只用这次坐标
      <br />
      找 <span className={styles.nowrap}>{NEARBY_RADIUS_LABEL}内</span>的奶茶、饮品和咖啡店。
    </>
  );
}

export function LocationPrompt({ state, onLocate, onSearch }: {
  state: "permission" | "denied" | "unavailable";
  onLocate: () => void;
  onSearch: () => void;
}) {
  return (
    <main className={styles.plate}>
      <div className={styles.plateRule} aria-hidden="true" />

      <header className={styles.brandBar}>
        <span className={styles.wordmark}>奶茶地图</span>
        <span className={styles.brandMeta}>SHANGHAI / {NEARBY_SCALE_LABEL}</span>
      </header>

      <section className={styles.entryHero}>
        <h1 className={styles.entryTitle}>
          商场里的
          <br />
          <span className={styles.titleAccent}>那一杯</span>
        </h1>
        <p className={styles.lede}>{renderCopy(state)}</p>
      </section>

      <nav className={styles.actionDirectory} aria-label="开始查找">
        <button type="button" className={styles.actionRow} onClick={onLocate} aria-label="使用我的位置">
          <span className={styles.actionIndex}>01</span>
          <span className={styles.actionIcon} aria-hidden="true">
            <LocateFixed size={18} strokeWidth={1.8} />
          </span>
          <span className={styles.actionBody}>
            <span className={styles.actionLabel}>使用我的位置</span>
            <span className={styles.actionHint}>只用于这一次查找</span>
          </span>
          <ArrowRight className={styles.actionArrow} aria-hidden="true" size={18} strokeWidth={1.8} />
        </button>
        <button type="button" className={styles.actionRow} onClick={onSearch} aria-label="搜索商场或地点">
          <span className={styles.actionIndex}>02</span>
          <span className={styles.actionIcon} aria-hidden="true">
            <Search size={18} strokeWidth={1.8} />
          </span>
          <span className={styles.actionBody}>
            <span className={styles.actionLabel}>搜索商场或地点</span>
            <span className={styles.actionHint}>环贸 iapm、国金中心、人民广场</span>
          </span>
          <ArrowRight className={styles.actionArrow} aria-hidden="true" size={18} strokeWidth={1.8} />
        </button>
      </nav>

      <footer className={styles.plateFooter}>
        <span>无需登录</span>
        <span>数据来自高德</span>
        <span>只支持上海</span>
      </footer>
    </main>
  );
}
