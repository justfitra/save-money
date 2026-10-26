import { useState, useEffect, useCallback } from "react";
import {
  MONTHS,
  CATS,
  IC,
  rp,
  loadAll,
  post,
  DEFAULT_URL,
  GAS_URL,
} from "./api";
import { Fa, Kpi, Pills, Donut, Ring, List, Modal } from "./ui";
import "./styles.css";
const sum = (a, k) => a.reduce((x, t) => x + t[k], 0);
const catSum = (tx, ex) => {
  const c = {};
  tx.forEach((t) => {
    if (t.o && t.c !== ex) c[t.c] = (c[t.c] || 0) + t.o;
  });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
};
function useLS(k, d) {
  const [v, s] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? d;
    } catch {
      return d;
    }
  });
  return [
    v,
    (x) => {
      s(x);
      try {
        localStorage.setItem(k, JSON.stringify(x));
      } catch {}
    },
  ];
}
const TABS = [
  ["ring", "fa-house", "Ringkasan"],
  ["trx", "fa-list-ul", "Transaksi"],
  ["bgt", "fa-bullseye", "Anggaran"],
  ["tab", "fa-piggy-bank", "Tabungan"],
  ["hut", "fa-handshake", "Hutang"],
  ["ana", "fa-chart-pie", "Analisis"],
];

export default function App() {
  const [url, setUrl] = useLS("url", DEFAULT_URL),
    [gas, setGas] = useLS("gas", GAS_URL),
    [bg, setBg] = useLS("bg", {}),
    [goal, setGoal] = useLS("goal", 0);
  const [db, setDb] = useState({ D: {}, TAB: [], HUT: [] }),
    [msg, setMsg] = useState(""),
    [cur, setCur] = useState("Oktober"),
    [view, setView] = useState("ring"),
    [modal, setModal] = useState(null),
    [q, setQ] = useState(""),
    [fc, setFc] = useState("");
  const { D, TAB, HUT } = db,
    ms = MONTHS.filter((m) => D[m]);
  const load = useCallback(async () => {
    const id = (url.match(/\/d\/([\w-]+)/) || [])[1];
    if (!id) return setMsg("Link tidak valid");
    setMsg("Mengambil data...");
    const r = await loadAll(id),
      have = MONTHS.filter((m) => r.D[m]);
    if (!have.length)
      return setMsg(
        "Gagal membaca. Pastikan sheet publik (Pelihat). " + r.miss.join("; "),
      );
    setDb(r);
    setCur((c) => (r.D[c] ? c : have[have.length - 1]));
    setMsg(
      "Tersinkron " +
        new Date().toLocaleTimeString("id-ID") +
        " · Termuat: " +
        have.join(", ") +
        (r.miss.length ? " · Tidak termuat: " + r.miss.join(", ") : ""),
    );
  }, [url]);
  useEffect(() => {
    load();
  }, []);
  const send = async (p) => {
    if (!gas) return setMsg("Isi URL Apps Script dulu.");
    try {
      await post(gas, p);
      setMsg("Terkirim, menyinkron ulang...");
      setTimeout(load, 2500);
    } catch (e) {
      setMsg("Gagal mengirim: " + e);
    }
  };
  const list = (sh) =>
    sh === "Tabungan" ? TAB : sh === "Hutang" ? HUT : D[sh].tx;
  const open = (sh, r = 0) =>
    setModal({
      sh,
      r,
      item: r
        ? list(sh).find((x) => x.r === r)
        : {
            d: "",
            c: sh === "Tabungan" || sh === "Hutang" ? cur : "Makan",
            n: "",
            i: 0,
            o: 0,
          },
    });
  const edit = (sh) => (t) => open(sh, t.r),
    del = (sh) => (t) => {
      if (confirm("Hapus baris ini dari Google Sheet?"))
        send({ act: "delete", sheet: sh, row: t.r, old: { d: t.d, n: t.n } });
    };
  const st = (m) => {
    const d = D[m],
      i = sum(d.tx, "i"),
      o = sum(d.tx, "o");
    return { g: d.gaji, i, o, s: d.gaji + i - o };
  };
  const fabSheet =
    view === "tab" ? "Tabungan" : view === "hut" ? "Hutang" : cur;
  const ready = ms.length > 0,
    s = ready && D[cur] ? st(cur) : null;

  const Ringkasan = () => {
    const S = ms.map((m) => ({ m, ...st(m) })),
      g = sum(S, "g"),
      i = sum(S, "i"),
      o = sum(S, "o"),
      sv = sum(TAB, "i") - sum(TAB, "o"),
      hs = sum(HUT, "i") - sum(HUT, "o");
    const k = ms.indexOf(cur),
      pv = k > 0 ? st(ms[k - 1]).o : 0,
      ch = pv ? Math.round(((s.o - pv) / pv) * 100) : null;
    return (
      <>
        <div className="hero">
          <small>Sisa uang {cur}</small>
          <h2 className={s.s < 0 ? "neg" : ""}>{rp(s.s)}</h2>
          <div>
            Masuk {rp(s.g + s.i)} · Keluar {rp(s.o)}
            {ch != null && (
              <>
                {" "}
                · <Fa n={ch > 0 ? "fa-caret-up" : "fa-caret-down"} />{" "}
                {Math.abs(ch)}% dari bulan lalu
              </>
            )}
          </div>
        </div>
        <Pills list={ms} cur={cur} set={setCur} />
        <Kpi
          items={[
            ["Total masuk", rp(g + i)],
            ["Total keluar", rp(o)],
            ["Tabungan", rp(sv), "in"],
            ["Sisa hutang", rp(hs), hs > 0 ? "out" : "in"],
          ]}
        />
        <div className="g2">
          <div className="card">
            <h3>Pengeluaran {cur} per kategori</h3>
            <Donut
              items={catSum(D[cur].tx)}
              c={rp(s.o).slice(3)}
              sub="keluar"
            />
          </div>
          <div className="card">
            <h3>Pemasukan vs pengeluaran (setahun)</h3>
            <Donut
              items={[
                ["Pemasukan", g + i],
                ["Pengeluaran", o],
              ]}
              c={Math.round((o / (g + i || 1)) * 100) + "%"}
              sub="terpakai"
            />
          </div>
          <div className="card">
            <h3>Porsi pengeluaran per bulan</h3>
            <Donut items={S.map((x) => [x.m, x.o])} c={ms.length} sub="bulan" />
          </div>
        </div>
      </>
    );
  };

  const Transaksi = () => {
    const L = D[cur].tx.filter(
      (t) =>
        (!fc || t.c === fc) &&
        (!q || (t.n + " " + t.c).toLowerCase().includes(q.toLowerCase())),
    );
    return (
      <>
        <Pills list={ms} cur={cur} set={setCur} />
        <Kpi
          items={[
            ["Gaji utama", rp(s.g)],
            ["Pemasukan tambahan", rp(s.i)],
            ["Pengeluaran", rp(s.o)],
            ["Sisa", rp(s.s), s.s < 0 ? "out" : "in"],
          ]}
        />
        <div className="card">
          <div className="row">
            <input
              placeholder="Cari transaksi..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select value={fc} onChange={(e) => setFc(e.target.value)}>
              <option value="">Semua kategori</option>
              {Object.keys(IC).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="row" style={{ margin: "10px 0" }}>
            <button
              className="g"
              onClick={() => {
                const v = prompt(
                  "Gaji / pemasukan utama " + cur + " (angka):",
                  D[cur].gaji,
                );
                if (v !== null && +v >= 0)
                  send({ act: "gaji", sheet: cur, v: +v });
              }}
            >
              <Fa n="fa-briefcase" /> Ubah gaji
            </button>
            <button
              className="g"
              onClick={() => {
                const n = prompt("Nama sheet baru (mis. November):");
                if (n) send({ act: "newSheet", tpl: cur, name: n });
              }}
            >
              <Fa n="fa-folder-plus" /> Sheet bulan baru
            </button>
          </div>
          <List list={L} ty={0} onEdit={edit(cur)} onDel={del(cur)} />
        </div>
      </>
    );
  };

  const Anggaran = () => {
    const sp = {};
    D[cur].tx.forEach((t) => {
      if (t.o) sp[t.c] = (sp[t.c] || 0) + t.o;
    });
    const set = (c) => {
      const v = prompt(
        "Batas anggaran bulanan untuk " + c + " (Rp, 0 = hapus):",
        bg[c] || "",
      );
      if (v !== null) setBg({ ...bg, [c]: +v || 0 });
    };
    return (
      <>
        <Pills list={ms} cur={cur} set={setCur} />
        <div className="card">
          <h3>
            <Fa n="fa-bullseye" /> Anggaran {cur}
          </h3>
          <div className="k">
            Ketuk kartu kategori untuk mengatur batas bulanan (tersimpan di
            perangkat ini).
          </div>
        </div>
        <div className="bg">
          {CATS.map((c) => {
            const b = bg[c] || 0,
              x = sp[c] || 0,
              p = b ? (x / b) * 100 : 0,
              col = p > 100 ? "var(--bad)" : p > 80 ? "var(--wn)" : "var(--ok)";
            return (
              <div className="card" key={c} onClick={() => set(c)}>
                <Ring
                  p={p}
                  col={b ? col : "var(--bd)"}
                  t={b ? Math.round(p) + "%" : "–"}
                />
                <div>
                  <b>
                    <Fa n={IC[c]} /> {c}
                  </b>
                </div>
                <div className="k">
                  {rp(x)} / {b ? rp(b) : "belum diatur"}
                </div>
                {p > 100 && (
                  <div className="out" style={{ fontSize: 12 }}>
                    Lewat {rp(x - b)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const Tabungan = () => {
    const a = sum(TAB, "i"),
      b = sum(TAB, "o"),
      sv = a - b,
      p = goal ? (sv / goal) * 100 : 0;
    return (
      <>
        <Kpi
          items={[
            ["Total disetor", rp(a)],
            ["Total diambil", rp(b)],
            ["Saldo tabungan", rp(sv), "in"],
          ]}
        />
        <div className="g2">
          <div className="card" style={{ textAlign: "center" }}>
            <h3>
              <Fa n="fa-bullseye" /> Target tabungan
            </h3>
            <div style={{ width: 130, margin: "auto" }}>
              <Ring
                p={p}
                col="var(--ac)"
                t={goal ? Math.round(p) + "%" : "–"}
              />
            </div>
            <div className="k" style={{ margin: "8px 0" }}>
              {goal ? rp(sv) + " dari " + rp(goal) : "Belum ada target"}
            </div>
            <button
              className="g"
              onClick={() => {
                const v = prompt("Target tabungan (Rp):", goal || "");
                if (v !== null) setGoal(+v || 0);
              }}
            >
              Atur target
            </button>
          </div>
          <div className="card">
            <h3>Disetor vs diambil</h3>
            <Donut
              items={[
                ["Disetor", a],
                ["Diambil", b],
              ]}
              c={rp(sv).slice(3)}
              sub="saldo"
            />
          </div>
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Riwayat tabungan</h3>
          <List
            list={TAB}
            ty={1}
            onEdit={edit("Tabungan")}
            onDel={del("Tabungan")}
          />
        </div>
      </>
    );
  };

  const Hutang = () => {
    const a = sum(HUT, "i"),
      b = sum(HUT, "o"),
      p = a ? (b / a) * 100 : 0;
    return (
      <>
        <Kpi
          items={[
            ["Total hutang", rp(a)],
            ["Dikembalikan", rp(b)],
            ["Sisa hutang", rp(a - b), a - b > 0 ? "out" : "in"],
          ]}
        />
        <div className="g2">
          <div className="card" style={{ textAlign: "center" }}>
            <h3>Progres pelunasan</h3>
            <div style={{ width: 130, margin: "auto" }}>
              <Ring p={p} col="var(--ok)" t={Math.round(p) + "%"} />
            </div>
            <div className="k" style={{ marginTop: 8 }}>
              {a - b > 0 ? "Tinggal " + rp(a - b) : "Lunas"}
            </div>
          </div>
          <div className="card">
            <h3>Hutang vs dikembalikan</h3>
            <Donut
              items={[
                ["Sisa hutang", Math.max(a - b, 0)],
                ["Dikembalikan", b],
              ]}
              c={rp(a - b).slice(3)}
              sub="sisa"
            />
          </div>
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Catatan hutang</h3>
          <List
            list={HUT}
            ty={2}
            onEdit={edit("Hutang")}
            onDel={del("Hutang")}
          />
        </div>
      </>
    );
  };

  const Analisis = () => {
    const all = ms.flatMap((m) => D[m].tx.map((t) => ({ ...t, m }))),
      S = ms.map((m) => ({ m, ...st(m) })),
      ce = catSum(all, "Tabungan");
    const spend = ce.reduce((a, x) => a + x[1], 0),
      inc = sum(S, "g") + sum(S, "i"),
      neg = S.filter((x) => x.s < 0).map((x) => x.m),
      avg = spend / (S.length || 1),
      sv = sum(TAB, "i") - sum(TAB, "o");
    const top = all
      .filter((t) => t.c !== "Tabungan")
      .sort((a, b) => b.o - a.o)
      .slice(0, 5);
    const pj = all.filter((t) => t.o && /pinjam|hutang/i.test(t.n)),
      bk = all.filter((t) => t.i && /kembali|di ?bayar/i.test(t.n)),
      hi = [...S].sort((a, b) => b.o - a.o)[0];
    const li = [
      <>
        Rata-rata pengeluaran (di luar tabungan): <b>{rp(avg)}</b>/bulan,{" "}
        {Math.round((spend / (inc || 1)) * 100)}% dari total pemasukan.
      </>,
      ce[0] && (
        <>
          Kategori terbesar: <b>{ce[0][0]}</b> ({rp(ce[0][1])},{" "}
          {Math.round((ce[0][1] / spend) * 100)}%).
        </>
      ),
      neg.length ? (
        <>
          Bulan minus: <b>{neg.join(", ")}</b> ({neg.length} dari {S.length}{" "}
          bulan).
        </>
      ) : (
        "Tidak ada bulan minus"
      ),
      <>
        Tabungan <b>{rp(sv)}</b> ≈ {avg ? (sv / avg).toFixed(1) : 0} bulan
        pengeluaran.
      </>,
      pj.length > 0 && (
        <>
          Ada <b>{pj.length}</b> transaksi keluar bertuliskan "pinjam/hutang"
          senilai <b>{rp(sum(pj, "o"))}</b>; tercatat kembali{" "}
          <b>{rp(sum(bk, "i"))}</b>. Ini ikut membengkakkan kategori Tagihan.
        </>
      ),
      hi && (
        <>
          Bulan paling boros: <b>{hi.m}</b> ({rp(hi.o)}).
        </>
      ),
    ].filter(Boolean);
    const exp = () => {
      const r = ["Bulan,Tanggal,Kategori,Deskripsi,Masuk,Keluar"];
      all.forEach((t) =>
        r.push(
          [t.m, t.d, t.c, '"' + t.n.replace(/"/g, '""') + '"', t.i, t.o].join(
            ",",
          ),
        ),
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([r.join("\n")], { type: "text/csv" }),
      );
      a.download = "transaksi-2026.csv";
      a.click();
    };
    return (
      <>
        <div className="card">
          <h3>
            <Fa n="fa-lightbulb" /> Temuan
          </h3>
          <ul>
            {li.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="g2">
          <div className="card">
            <h3>Pengeluaran per kategori (setahun)</h3>
            <Donut items={ce} c={rp(spend).slice(3)} sub="keluar" />
          </div>
          <div className="card">
            <h3>Sumber pengeluaran tertinggi</h3>
            <Donut
              items={top.map((t) => [t.n || t.c, t.o])}
              c="Top 5"
              sub="terbesar"
            />
          </div>
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Rekap bulanan</h3>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "var(--mu)" }}>
                  <th>Bulan</th>
                  <th>Masuk</th>
                  <th>Keluar</th>
                  <th>Sisa</th>
                </tr>
              </thead>
              <tbody>
                {S.map((x) => (
                  <tr key={x.m}>
                    <td style={{ padding: "6px 0" }}>{x.m}</td>
                    <td>{rp(x.g + x.i)}</td>
                    <td>{rp(x.o)}</td>
                    <td className={x.s < 0 ? "out" : "in"}>{rp(x.s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button style={{ marginTop: 12 }} onClick={exp}>
            <Fa n="fa-download" /> Unduh semua transaksi (CSV)
          </button>
        </div>
      </>
    );
  };

  const V = {
    ring: Ringkasan,
    trx: Transaksi,
    bgt: Anggaran,
    tab: Tabungan,
    hut: Hutang,
    ana: Analisis,
  }[view];
  return (
    <>
      <div className="w">
        <header>
          <h1>
            <Fa n="fa-wallet" /> Pengatur Keuangan
          </h1>
          <button onClick={load}>
            <Fa n="fa-rotate" /> Sinkron
          </button>
        </header>
        <details>
          <summary>
            <Fa n="fa-gear" /> Pengaturan sumber data
          </summary>
          <div className="card" style={{ marginTop: 8 }}>
            <div className="k">Link Google Sheet</div>
            <input
              style={{ width: "100%" }}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <div className="k" style={{ marginTop: 8 }}>
              URL Apps Script
            </div>
            <input
              style={{ width: "100%" }}
              value={gas}
              onChange={(e) => setGas(e.target.value)}
            />
          </div>
        </details>
        <div id="msg">{msg}</div>
        {ready && s && V()}
      </div>
      <button className="fab" onClick={() => ready && open(fabSheet)}>
        <Fa n="fa-plus" />
      </button>
      <nav>
        {TABS.map(([k, i, n]) => (
          <button
            key={k}
            className={k === view ? "on" : ""}
            onClick={() => {
              setView(k);
              scrollTo(0, 0);
            }}
          >
            <span>
              <Fa n={i} />
            </span>
            {n}
          </button>
        ))}
      </nav>
      {modal && (
        <Modal
          m={modal}
          onClose={() => setModal(null)}
          onSave={(p) => {
            setModal(null);
            send(p);
          }}
        />
      )}
    </>
  );
}
