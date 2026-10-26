export const DEFAULT_URL =
  "https://docs.google.com/spreadsheets/d/1j4zjt8jFbzS9cfcKQiqj3hXB-vlzhQ0GEM7RIKXzNMo/edit";
export const GAS_URL =
  "https://script.google.com/macros/s/AKfycbwtLULKN64hma56qpSPggAOCWRTqbp9aIkU6WJgDQ0chIH9cCKZTkKbGaaXmvWoREr2kg/exec";
export const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
export const CATS = [
  "Makan",
  "Kebutuhan",
  "Tagihan",
  "Transport",
  "Hiburan",
  "Lainnya",
];
export const IC = {
  Makan: "fa-utensils",
  Kebutuhan: "fa-cart-shopping",
  Tagihan: "fa-receipt",
  Transport: "fa-bus",
  Hiburan: "fa-gamepad",
  Tabungan: "fa-piggy-bank",
  Pemasukan: "fa-money-bill-wave",
  Lainnya: "fa-box",
};
export const rp = (n) =>
  (n < 0 ? "-" : "") + "Rp " + Math.abs(Math.round(n)).toLocaleString("id-ID");
const num = (s) => {
  s = (s || "").trim();
  if (!s) return 0;
  const n = parseInt(s.replace(/\D/g, "")) || 0;
  return s.startsWith("-") ? -n : n;
};
function csv(t) {
  const r = [];
  let row = [],
    c = "",
    q = false;
  for (let i = 0; i < t.length; i++) {
    const h = t[i];
    if (q) {
      if (h == '"' && t[i + 1] == '"') {
        c += '"';
        i++;
      } else if (h == '"') q = false;
      else c += h;
    } else if (h == '"') q = true;
    else if (h == ",") {
      row.push(c);
      c = "";
    } else if (h == "\n") {
      row.push(c);
      r.push(row);
      row = [];
      c = "";
    } else if (h != "\r") c += h;
  }
  row.push(c);
  r.push(row);
  return r;
}
let JC = 0;
function jsonp(id, m, rg) {
  return new Promise((ok, no) => {
    const cb = "__g" + JC++,
      sc = document.createElement("script");
    const t = setTimeout(() => {
      sc.remove();
      no(new Error("Timeout: sheet belum publik atau akses diblokir"));
    }, 12000);
    window[cb] = (r) => {
      clearTimeout(t);
      sc.remove();
      if (r.status != "ok")
        return no(
          new Error(
            (r.errors && r.errors[0].message) || "Sheet tidak ditemukan",
          ),
        );
      ok(
        r.table.rows.map((x) =>
          x.c.map((c) =>
            c ? (c.f != null ? c.f : c.v == null ? "" : String(c.v)) : "",
          ),
        ),
      );
    };
    sc.onerror = () => {
      clearTimeout(t);
      no(new Error("Script diblokir"));
    };
    sc.src = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?headers=0&tqx=responseHandler:${cb}&sheet=${encodeURIComponent(m)}${rg ? "&range=" + rg : ""}`;
    document.head.appendChild(sc);
  });
}
async function getRows(id, m, rg) {
  try {
    const r = await fetch(
      `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?headers=0&tqx=out:csv&sheet=${encodeURIComponent(m)}${rg ? "&range=" + rg : ""}`,
    );
    if (!r.ok) throw 0;
    return csv(await r.text());
  } catch (e) {
    return jsonp(id, m, rg);
  }
}
const parse = (rows) => {
  const tx = [];
  rows.forEach((x, i) => {
    if (/^\d\d\/\d\d\/\d{4}$/.test((x[1] || "").trim()))
      tx.push({
        r: i + 1,
        d: x[1].trim(),
        c: (x[2] || "").trim(),
        n: (x[3] || "").trim(),
        i: num(x[4]),
        o: num(x[5]),
      });
  });
  return tx;
};
export async function loadAll(id) {
  const D = {},
    miss = [];
  let TAB = [],
    HUT = [];
  const one = async (n, f) => {
    try {
      const h = await getRows(id, n, "B1:B8");
      if (h.some((x) => String(x[0]).toUpperCase().includes(n.toUpperCase())))
        await f(await getRows(id, n), h);
      else miss.push(n + " (sheet tidak ada)");
    } catch (e) {
      miss.push(n + " (" + (e.message || e) + ")");
    }
  };
  await Promise.all([
    ...MONTHS.map((m) =>
      one(m, async (r, h) => {
        const gi = h.findIndex((x) => /gaji/i.test(x[0]));
        let g = 0;
        if (gi >= 0)
          try {
            g = num(
              ((await getRows(id, m, `B${gi + 2}:B${gi + 2}`))[0] || [])[0],
            );
          } catch (e) {}
        D[m] = { gaji: g, tx: parse(r) };
      }),
    ),
    one("Tabungan", (r) => {
      TAB = parse(r);
    }),
    one("Hutang", (r) => {
      HUT = parse(r);
    }),
  ]);
  return { D, TAB, HUT, miss };
}
export const post = (gas, p) =>
  fetch(gas, { method: "POST", mode: "no-cors", body: JSON.stringify(p) });
