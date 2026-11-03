"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import styles from "../map/map-ui.module.css";

export function CopyBrandButton({ brandName }: { brandName: string }) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copyBrand() {
    try {
      await navigator.clipboard.writeText(brandName);
      setMessage("已复制，可前往微信搜索");
    } catch {
      setMessage("复制失败，请长按品牌名");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), 4200);
  }

  return (
    <>
      <button
        type="button"
        className={styles.copyButton}
        data-copied={message ? "true" : undefined}
        aria-label={`复制${brandName}品牌名`}
        onClick={copyBrand}
      >
        {message ? (
          <Check aria-hidden="true" size={13} strokeWidth={2.4} />
        ) : (
          <Copy aria-hidden="true" size={13} strokeWidth={2.2} />
        )}
        <span>{message ? "已复制" : "复制"}</span>
      </button>
      {message ? (
        <div className={styles.toast} role="status" aria-live="polite">
          {message}
        </div>
      ) : null}
    </>
  );
}
