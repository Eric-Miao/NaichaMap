import styles from "../experience.module.css";

const STATUS = {
  loading: { title: "正在读取附近门店", note: "正在核对这个位置的缓存" },
  refreshing: { title: "正在更新门店数据", note: "先展示已有结果，稍后自动刷新" },
  empty: { title: "附近暂时没有记录", note: "如果你知道这里有新店，可以帮我们补充。" },
  error: { title: "暂时加载失败", note: "请稍候" },
} as const;

export function PageStatus({ kind, message, retryable = false, onRetry, onCorrection }: {
  kind: "loading" | "refreshing" | "error" | "empty";
  message?: string;
  retryable?: boolean;
  onRetry?: () => void;
  onCorrection?: () => void;
}) {
  const status = STATUS[kind];

  return (
    <main className={styles.centered}>
      <section className={styles.statusCard} aria-live="polite">
        <h1>{status.title}</h1>
        <p className={styles.statusNote}>{message ?? status.note}</p>

        {kind === "loading" || kind === "refreshing" ? (
          <div className={styles.skeletonList} aria-hidden="true">
            {["01", "02", "03"].map((index) => (
              <div key={index} className={styles.skeletonRow}>
                <span>{index}</span>
                <span className={styles.skeleton} />
              </div>
            ))}
          </div>
        ) : null}

        {retryable || kind === "empty" ? (
          <div className={styles.statusActions}>
            {retryable ? (
              <button type="button" className={styles.primary} onClick={onRetry}>
                重试
              </button>
            ) : null}
            {kind === "empty" ? (
              <button type="button" className={styles.primary} onClick={onCorrection}>
                补充遗漏门店
              </button>
            ) : null}
          </div>
        ) : null}

        <footer className={styles.statusFooter}>NAICHAMAP / SHANGHAI / 1 KM</footer>
      </section>
    </main>
  );
}
