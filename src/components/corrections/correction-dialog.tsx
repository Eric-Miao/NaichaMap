"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";

import { MapApiError, submitCorrection } from "@/features/map/api";
import type { StoreSummary } from "@/features/nearby/contracts";

import styles from "../experience.module.css";

export function CorrectionDialog({ open, store, onClose }: {
  open: boolean;
  store?: StoreSummary | null;
  onClose: () => void;
}) {
  const [issueType, setIssueType] = useState(store ? "incorrect_info" : "missing_store");
  const [storeName, setStoreName] = useState(store?.name ?? "");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  function close() {
    setIssueType(store ? "incorrect_info" : "missing_store");
    setStoreName(store?.name ?? "");
    setDetails("");
    setMessage("");
    onClose();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      await submitCorrection({
        storeId: store?.id ?? null,
        issueType: issueType as "not_exists" | "incorrect_info" | "missing_store" | "other",
        details,
        submittedStoreName: storeName || null,
      });
      setMessage("感谢，你的反馈已记录");
    } catch (error) {
      if (error instanceof MapApiError && error.code === "RATE_LIMITED") {
        setMessage(`提交太频繁，请 ${Math.ceil((error.retryAfterSeconds ?? 300) / 60)} 分钟后再试`);
      } else {
        setMessage(error instanceof Error ? error.message : "暂时无法提交纠错");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.dialogBackdrop}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="correction-title">
        <div className={styles.dialogHeader}>
          <h2 id="correction-title">补充或纠错</h2>
          <button type="button" className={styles.closeButton} aria-label="关闭纠错" onClick={close}><X aria-hidden="true" size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <label className={styles.field}>问题类型
            <select className={styles.select} value={issueType} onChange={(event) => setIssueType(event.target.value)}>
              <option value="missing_store">遗漏门店</option><option value="not_exists">门店不存在</option><option value="incorrect_info">信息有误</option><option value="other">其他</option>
            </select>
          </label>
          <label className={styles.field}>门店名称
            <input className={styles.input} value={storeName} maxLength={200} onChange={(event) => setStoreName(event.target.value)} />
          </label>
          <label className={styles.field}>补充说明
            <textarea className={styles.textarea} value={details} minLength={1} maxLength={500} required onChange={(event) => setDetails(event.target.value)} />
          </label>
          <div className={styles.actions}><button type="submit" className={styles.primary} disabled={submitting}>{submitting ? "提交中" : "提交纠错"}</button></div>
          {message ? <p className={styles.formMessage} role="status">{message}</p> : null}
        </form>
      </section>
    </div>
  );
}
