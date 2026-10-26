"use client";

import { FormEvent, useState } from "react";

import { searchPlaces } from "@/features/map/api";
import type { PlaceSearchResult } from "@/features/place-search/service";

import styles from "../experience.module.css";

export function PlaceSearch({ onSelect, onBack }: {
  onSelect: (place: PlaceSearchResult) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const found = await searchPlaces(query);
      setResults(found);
      if (found.length === 0) setMessage("没有找到，试试更完整的商场名或地址");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "暂时无法搜索地点");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.centered}>
      <section className={styles.panel}>
        <h2>搜索上海商场或地点</h2>
        <p>例如：环贸 iapm、上海国金中心、人民广场。</p>
        <form className={styles.searchForm} onSubmit={submit}>
          <input className={styles.input} type="search" aria-label="搜索上海商场或地点" value={query} minLength={2} maxLength={80} onChange={(event) => setQuery(event.target.value)} />
          <button className={styles.primary} type="submit" disabled={loading}>{loading ? "搜索中" : "搜索"}</button>
        </form>
        {message ? <p role="status">{message}</p> : null}
        <div className={styles.searchResults}>
          {results.map((result) => (
            <button key={`${result.label}-${result.location.lng}-${result.location.lat}`} type="button" className={styles.result} aria-label={`${result.label}，${result.address}`} onClick={() => onSelect(result)}>
              <strong>{result.label}</strong><span>{result.address}</span>
            </button>
          ))}
        </div>
        <button type="button" className={styles.textButton} onClick={onBack}>返回定位</button>
      </section>
    </main>
  );
}
