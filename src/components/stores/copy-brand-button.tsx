"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

import styles from "../map/map-ui.module.css";

export function CopyBrandButton({ brandName }: { brandName: string }) {
  const [message, setMessage] = useState("");

  async function copyBrand() {
    await navigator.clipboard.writeText(brandName);
    setMessage("已复制，可前往微信搜索");
  }

  return (
    <>
      <button
        type="button"
        className={styles.copyButton}
        aria-label={`复制${brandName}品牌名`}
        onClick={copyBrand}
      >
        <Copy aria-hidden="true" size={14} strokeWidth={2.2} />
        复制
      </button>
      {message ? (
        <div className={styles.toast} role="status" aria-live="polite">
          {message}
        </div>
      ) : null}
    </>
  );
}
