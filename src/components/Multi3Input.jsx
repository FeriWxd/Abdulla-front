import React, { useMemo } from "react";
import "./Multi3Input.css"; // stil dosyası

const LETTERS = ["A", "B", "C", "D", "E"];

/**
 * value: { s1: string[], s2: string[], s3: string[] }
 * onChange(next) -> void
 *
 * Kurallar:
 * - Her satırda 1–2 harf
 * - Aynı harf globalde tek bir satırda bulunabilir
 * - Aynı harfe başka satırda tıklarsan otomatik taşır
 */
export default function Multi3Input({ value, onChange }) {
  const v = useMemo(
    () => ({
      s1: Array.isArray(value?.s1) ? value.s1 : [],
      s2: Array.isArray(value?.s2) ? value.s2 : [],
      s3: Array.isArray(value?.s3) ? value.s3 : [],
    }),
    [value]
  );

  const used = useMemo(
    () => new Set([...(v.s1 || []), ...(v.s2 || []), ...(v.s3 || [])]),
    [v]
  );

  const commit = (next) => {
    onChange?.({
      s1: Array.from(new Set(next.s1)).slice(0, 2),
      s2: Array.from(new Set(next.s2)).slice(0, 2),
      s3: Array.from(new Set(next.s3)).slice(0, 2),
    });
  };

  const toggle = (seg, L) => {
    const next = { s1: [...v.s1], s2: [...v.s2], s3: [...v.s3] };
    const target = next[seg];

    const hasHere = target.includes(L);
    if (hasHere) {
      // aynı satırda varsa kaldır
      commit({
        ...next,
        [seg]: target.filter((x) => x !== L),
      });
      return;
    }

    // segment limit: max 2
    if (target.length >= 2) return;

    // globalde varsa, diğer satırlardan sök
    ["s1", "s2", "s3"].forEach((k) => {
      if (k !== seg) next[k] = next[k].filter((x) => x !== L);
    });

    // bu satıra ekle
    target.push(L);
    commit(next);
  };

  const Segment = ({ segKey, title }) => (
    <div className="m3-row">
      <div className="m3-label">{title}</div>
      <div className="m3-buttons" role="group" aria-label={`${title} seçenekleri`}>
        {LETTERS.map((L) => {
          const active = (v[segKey] || []).includes(L);
          const elsewhere = !active && used.has(L);
          return (
            <button
              key={L}
              type="button"
              className={`m3-btn ${active ? "m3-active" : ""} ${elsewhere ? "m3-elsewhere" : ""}`}
              aria-pressed={active}
              onClick={() => toggle(segKey, L)}
            >
              {L}
            </button>
          );
        })}
      </div>
      <div className="m3-hint">(maks 2 seçim)</div>
    </div>
  );

  return (
    <div className="m3-wrap">
      <Segment segKey="s1" title="1." />
      <Segment segKey="s2" title="2." />
      <Segment segKey="s3" title="3." />
      <div className="m3-footer">
        Her satırda en az 1, en fazla 2 seçim; aynı harf farklı satırlarda kullanılamaz.
      </div>
    </div>
  );
}
