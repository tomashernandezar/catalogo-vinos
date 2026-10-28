/* Carga columnas y vinos desde la planilla de Google (si está configurada) o desde /data. */
(function(){
  function parseCSV(text){
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++){
      const c = text[i];
      if (q){
        if (c === '"'){ if (text[i+1] === '"'){ cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r"){
        if (c === "\r" && text[i+1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    const head = (rows.shift() || []).map(h => h.trim().toLowerCase());
    return rows
      .filter(r => r.some(v => v.trim() !== ""))
      .map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
  }

  async function bajar(url, local){
    if (url){
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (r.ok) return parseCSV(await r.text());
      } catch (e) { /* si la planilla falla, se usa la copia local */ }
    }
    const r = await fetch(local, { cache: "no-cache" });
    return parseCSV(await r.text());
  }

  const si = v => /^(si|sí|s|x|1|true|yes)$/i.test(v || "");
  const num = v => { const n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? 999 : n; };

  window.cargarDatos = async function(){
    const [cols, vinos] = await Promise.all([
      bajar(CONFIG.planillaColumnas, "data/columnas.csv"),
      bajar(CONFIG.planillaVinos, "data/vinos.csv")
    ]);
    const VINOS = {};
    for (const v of vinos){
      if (!v.id || !si(v.en_stock)) continue;
      v.columna = v.columna.toLowerCase();
      v.fila = v.fila || v.estante || "";
      v.maridaje = (v.maridaje || "").split(";").map(s => s.trim()).filter(Boolean);
      v.ejemplo = si(v.ejemplo);
      VINOS[v.id] = v;
    }
    const COLUMNAS = cols
      .filter(c => c.id)
      .sort((a, b) => num(a.orden) - num(b.orden))
      .map(c => {
        const id = c.id.toLowerCase();
        const mios = Object.values(VINOS).filter(v => v.columna === id);
        const nums = [...new Set(mios.map(v => num(v.fila)))].sort((a, b) => a - b);
        return {
          id, nombre: c.nombre, titulo: c.titulo,
          filas: nums.map(n => ({
            n,
            bodegas: [...new Set(mios.filter(v => num(v.fila) === n).map(v => v.bodega).filter(Boolean))],
            vinos: mios.filter(v => num(v.fila) === n).sort((a, b) => num(a.orden) - num(b.orden)).map(v => v.id)
          }))
        };
      });
    return { COLUMNAS, VINOS };
  };
})();
