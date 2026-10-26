import { useState } from "react";
import { IC, rp } from "./api";
const PAL = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#a855f7",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#64748b",
  "#14b8a6",
  "#eab308",
];
export const Fa = ({ n }) => <i className={"fa-solid " + n} />;
export const Kpi = ({ items }) => (
  <div className="kp">
    {items.map(([k, v, c]) => (
      <div className="kc" key={k}>
        <div className="k">{k}</div>
        <div className={"v " + (c || "")}>{v}</div>
      </div>
    ))}
  </div>
);
export const Pills = ({ list, cur, set }) => (
  <div className="pl">
    {list.map((m) => (
      <button key={m} className={m === cur ? "on" : ""} onClick={() => set(m)}>
        {m.slice(0, 3)}
      </button>
    ))}
  </div>
);
export function Donut({ items, c, sub }) {
  items = items.filter((x) => x[1] > 0);
  if (!items.length) return <div className="em">Belum ada data</div>;
  const tot = items.reduce((a, x) => a + x[1], 0),
    R = 52,
    C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div className="dn">
      <svg viewBox="0 0 140 140" className="ds">
        <circle
          r={R}
          cx="70"
          cy="70"
          fill="none"
          stroke="var(--bd)"
          strokeWidth="22"
        />
        {items.map(([k, v], i) => {
          const l = (v / tot) * C,
            o = off;
          off += l;
          return (
            <circle
              key={k + i}
              r={R}
              cx="70"
              cy="70"
              fill="none"
              stroke={PAL[i % PAL.length]}
              strokeWidth="22"
              strokeDasharray={`${l} ${C - l}`}
              strokeDashoffset={-o}
              transform="rotate(-90 70 70)"
            />
          );
        })}
        <text x="70" y="68" textAnchor="middle" className="dc">
          {c}
        </text>
        <text x="70" y="82" textAnchor="middle" className="dsub">
          {sub}
        </text>
      </svg>
      <div className="lg">
        {items.map(([k, v], i) => (
          <div key={k + i}>
            <i style={{ background: PAL[i % PAL.length] }} />
            <span>{k}</span>
            <b>{rp(v)}</b>
            <em>{Math.round((v / tot) * 100)}%</em>
          </div>
        ))}
      </div>
    </div>
  );
}
export function Ring({ p, col, t, size }) {
  const R = 40,
    C = 2 * Math.PI * R,
    l = (Math.min(p, 100) / 100) * C;
  return (
    <svg
      viewBox="0 0 100 100"
      style={size ? { width: size, height: size } : null}
    >
      <circle
        cx="50"
        cy="50"
        r={R}
        fill="none"
        stroke="var(--bd)"
        strokeWidth="12"
      />
      <circle
        cx="50"
        cy="50"
        r={R}
        fill="none"
        stroke={col}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${l} ${C}`}
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="56"
        textAnchor="middle"
        fontSize="18"
        fontWeight="700"
        fill="var(--tx)"
      >
        {t}
      </text>
    </svg>
  );
}
export function List({ list, ty, onEdit, onDel }) {
  if (!list.length)
    return (
      <div className="ls">
        <div className="em">Belum ada data</div>
      </div>
    );
  return (
    <div className="ls">
      {[...list].reverse().map((t) => {
        const n = t.i - t.o,
          good = ty === 2 ? n < 0 : n >= 0;
        const ic =
          ty === 1
            ? t.i
              ? "fa-arrow-up"
              : "fa-arrow-down"
            : ty === 2
              ? t.i
                ? "fa-file-pen"
                : "fa-circle-check"
              : IC[t.c] || "fa-box";
        return (
          <div className="it" key={t.r}>
            <div className="ic">
              <Fa n={ic} />
            </div>
            <div className="mid">
              <b>{t.n || "-"}</b>
              <small>
                {t.d} · {t.c}
              </small>
            </div>
            <div className={"am " + (good ? "in" : "out")}>
              {n >= 0 ? "+" : "-"}
              {rp(Math.abs(n)).slice(3)}
            </div>
            <div className="ac">
              <button className="g" onClick={() => onEdit(t)}>
                <Fa n="fa-pen" />
              </button>
              <button className="g" onClick={() => onDel(t)}>
                <Fa n="fa-trash" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
const LB = [
  ["Kategori", "Deskripsi", "Masuk", "Keluar"],
  ["Bulan/Sheet", "Keterangan", "Disetor", "Diambil"],
  ["Bulan/Sheet", "Keterangan", "Hutang", "Dikembalikan"],
];
const iso = (d) => {
  if (!d) return new Date().toISOString().slice(0, 10);
  const [a, b, c] = d.split("/");
  return `${c}-${b}-${a}`;
};
export function Modal({ m, onSave, onClose }) {
  const ty = m.sh === "Tabungan" ? 1 : m.sh === "Hutang" ? 2 : 0,
    L = LB[ty],
    t = m.item;
  const [f, setF] = useState({
    d: iso(t.d),
    c: t.c,
    n: t.n,
    i: t.i || "",
    o: t.o || "",
  });
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const go = () => {
    if (!f.d) return;
    const [y, mo, d] = f.d.split("-");
    onSave({
      act: m.r ? "update" : "add",
      sheet: m.sh,
      row: m.r,
      old: { d: t.d, n: t.n },
      v: [`${d}/${mo}/${y}`, f.c, f.n, +f.i || "", +f.o || ""],
    });
  };
  return (
    <div className="md">
      <div className="card">
        <b>
          {m.r ? "Ubah" : "Tambah"} — {m.sh}
        </b>
        <label>Tanggal</label>
        <input type="date" value={f.d} onChange={s("d")} />
        <label>{L[0]}</label>
        <input value={f.c} onChange={s("c")} list={ty ? undefined : "cl"} />
        <datalist id="cl">
          {Object.keys(IC).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </datalist>
        <label>{L[1]}</label>
        <input value={f.n} onChange={s("n")} />
        <label>{L[2]}</label>
        <input
          type="number"
          inputMode="numeric"
          value={f.i}
          onChange={s("i")}
        />
        <label>{L[3]}</label>
        <input
          type="number"
          inputMode="numeric"
          value={f.o}
          onChange={s("o")}
        />
        <div className="row" style={{ marginTop: 14 }}>
          <button onClick={go}>Simpan</button>
          <button className="g" onClick={onClose}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
