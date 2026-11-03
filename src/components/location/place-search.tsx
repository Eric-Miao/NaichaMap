"use client";

import { type FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { searchPlaces } from "@/features/map/api";
import type { PlaceSearchResult } from "@/features/place-search/service";
import { NEARBY_RADIUS_LABEL } from "@/lib/geo/search";

import styles from "../experience.module.css";

const EXAMPLES = ["环贸 iapm", "上海国金中心", "兴业太古汇", "人民广场"];

export function PlaceSearch({ onSelect, onBack }: {
  onSelect: (place: PlaceSearchResult) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const ready = query.trim().length >= 2;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
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
    <main className={styles.plate}>
      <header className={styles.searchBar}>
        <button type="button" className={styles.backButton} onClick={onBack} aria-label="返回定位">
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.8} />
          <span>返回定位</span>
        </button>
        <span className={styles.brandMeta}>SEARCH / SHANGHAI</span>
      </header>

      <section className={styles.searchBody}>
        <h1 className={styles.searchTitle}>搜索上海商场或地点</h1>
        <p className={styles.lede}>定位不可用时也能用。输入商场、写字楼或路口名称，我们展示它周边 {NEARBY_RADIUS_LABEL}。</p>

        <form className={styles.searchForm} onSubmit={submit}>
          <label className={styles.srOnly} htmlFor="place-query">搜索上海商场或地点</label>
          <input
            id="place-query"
            className={styles.input}
            type="search"
            aria-label="搜索上海商场或地点"
            value={query}
            minLength={2}
            maxLength={80}
            placeholder="输入商场或地点"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className={styles.primary} type="submit" disabled={loading || !ready}>
            {loading ? "搜索中" : "搜索"}
          </button>
        </form>

        <div className={styles.examples} aria-label="示例地点">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className={styles.example}
              onClick={() => setQuery(example)}
            >
              {example}
            </button>
          ))}
        </div>

        {message ? <p className={styles.formMessage} role="status">{message}</p> : null}

        <div className={styles.searchResults}>
          {results.map((result, index) => (
            <button
              key={`${result.label}-${result.location.lng}-${result.location.lat}`}
              type="button"
              className={styles.result}
              aria-label={`${result.label}，${result.address}`}
              onClick={() => onSelect(result)}
            >
              <span className={styles.resultIndex}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.resultCopy}>
                <strong>{result.label}</strong>
                <span>{result.address || "地址未提供"}</span>
              </span>
              <ArrowRight className={styles.resultArrow} aria-hidden="true" size={16} strokeWidth={1.8} />
            </button>
          ))}
        </div>
      </section>

      <footer className={styles.plateFooter}>
        <span>数据来自高德</span>
        <span>结果按相关度排序</span>
      </footer>
    </main>
  );
}
