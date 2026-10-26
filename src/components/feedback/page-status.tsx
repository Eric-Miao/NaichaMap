import styles from "../experience.module.css";

export function PageStatus({ kind, message, retryable = false, onRetry, onCorrection }: {
  kind: "loading" | "refreshing" | "error" | "empty";
  message?: string;
  retryable?: boolean;
  onRetry?: () => void;
  onCorrection?: () => void;
}) {
  const title = kind === "loading" ? "正在读取附近门店" : kind === "refreshing" ? "正在更新门店数据" : kind === "empty" ? "附近暂时没有记录" : "暂时加载失败";
  return (
    <main className={styles.centered}>
      <section className={styles.statusCard} aria-live="polite">
        <h2>{title}</h2>
        <p>{message ?? (kind === "empty" ? "如果你知道这里有新店，可以帮我们补充。" : "请稍候")}</p>
        {kind === "loading" || kind === "refreshing" ? <><div className={styles.skeleton} /><div className={styles.skeleton} /><div className={styles.skeleton} /></> : null}
        {retryable ? <button type="button" className={styles.primary} onClick={onRetry}>重试</button> : null}
        {kind === "empty" ? <button type="button" className={styles.primary} onClick={onCorrection}>补充遗漏门店</button> : null}
      </section>
    </main>
  );
}
