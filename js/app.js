/* Vistas: columna con sus bodegas (#col-a), vinos de una bodega (#bod-a-bodega-caelum) y ficha de cada vino (#vino-caelum-icono). */
(async function(){
  const app = document.getElementById("app");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const thumbs = {};
  let COLUMNAS = [], VINOS = {};

  document.getElementById("logo").innerHTML = CONFIG.logo ? `<img src="${esc(CONFIG.logo)}" alt="${esc(CONFIG.local)}">` : esc(CONFIG.local);
  document.getElementById("claim").textContent = CONFIG.claim || "";

  try { ({ COLUMNAS, VINOS } = await cargarDatos()); }
  catch (e) { app.innerHTML = `<p class="empty">No pudimos cargar el catálogo. Probá de nuevo en un momento.</p>`; return; }

  const colDe = id => COLUMNAS.find(c => c.id === VINOS[id].columna) || { id: VINOS[id].columna, nombre: "Columna" };
  const precio = v => CONFIG.mostrarPrecios && v.precio ? `<span class="price">$ ${esc(v.precio)}</span>` : "";

  const slug = t => String(t || "otros").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const bodegaId = v => `${v.columna}-${slug(v.bodega)}`;
  const vinosDeBodega = bid => Object.keys(VINOS).filter(id => bodegaId(VINOS[id]) === bid)
    .sort((a, b) => (parseFloat(VINOS[a].fila) - parseFloat(VINOS[b].fila)) || (parseFloat(VINOS[a].orden) - parseFloat(VINOS[b].orden)));
  const miniatura = id => thumbs[id] ? `<img src="${thumbs[id]}" alt="">` : `<span class="ph"></span>`;

  // Columna → filas → una tarjeta por bodega
  function vistaColumna(col){
    Botella3D.parar();
    document.title = `${col.nombre} · ${CONFIG.local}`;
    const [p1, ...resto] = (col.titulo || "").split(" ");
    app.innerHTML = `
      <header class="head">
        <span class="eyebrow">${esc(col.nombre)}</span>
        <h1>${esc(p1)} <em>${esc(resto.join(" "))}</em></h1>
        <p>Elegí una bodega para ver todos sus vinos en 3D. Las filas van de arriba hacia abajo, igual que en la estantería.</p>
      </header>
      ${col.filas.length ? col.filas.map(f => `
        <section class="shelf" aria-label="Fila ${f.n}">
          <div class="shelf-label eyebrow">Fila ${f.n}</div>
          ${[...new Set(f.vinos.map(id => bodegaId(VINOS[id])))].map(bid => {
            const ids = vinosDeBodega(bid), v = VINOS[ids[0]];
            return `<button class="bodega" data-bod="${esc(bid)}">
              <span class="strip">${ids.slice(0, 5).map(id => `<span class="thumb" data-thumb="${esc(id)}">${miniatura(id)}</span>`).join("")}</span>
              <span class="bodega-txt">
                ${v.bodega_logo ? `<h3 class="logo-mini"><img src="${esc(v.bodega_logo)}" alt="${esc(v.bodega)}"></h3>` : `<h3>${esc(v.bodega || "Otros vinos")}</h3>`}
                <span class="meta">${[v.bodega_ubicacion, `${ids.length} ${ids.length === 1 ? "vino" : "vinos"}`].filter(Boolean).map(esc).join(" · ")}</span>
              </span>
              <span class="go" aria-hidden="true">Ver →</span>
            </button>`; }).join("")}
        </section>`).join("") : `<p class="empty">Todavía no hay vinos cargados en esta columna.</p>`}
      ${COLUMNAS.length > 1 ? `<nav class="cols" aria-label="Otras columnas">
        ${COLUMNAS.map(c => `<button class="chip" data-col="${esc(c.id)}" aria-current="${c.id === col.id}">${esc(c.nombre)}</button>`).join("")}
      </nav>` : ""}
      <p class="foot">¿Dudas? Consultá al personal del local, te ayudamos a elegir.</p>`;
    app.querySelectorAll(".bodega").forEach(b => b.onclick = () => { location.hash = "bod-" + b.dataset.bod; });
    app.querySelectorAll(".chip").forEach(b => b.onclick = () => { location.hash = "col-" + b.dataset.col; });
    window.scrollTo(0, 0);
  }

  // Bodega → sus vinos agrupados por línea, en grilla
  function vistaBodega(bid){
    Botella3D.parar();
    const ids = vinosDeBodega(bid), v = VINOS[ids[0]], col = colDe(ids[0]);
    document.title = `${v.bodega} · ${CONFIG.local}`;
    const lineas = [];
    for (const id of ids){
      const n = VINOS[id].nombre;
      const l = lineas.find(x => x.nombre === n) || (lineas.push({ nombre: n, ids: [] }), lineas[lineas.length - 1]);
      l.ids.push(id);
    }
    const datos = [v.bodega_ubicacion, v.bodega_especialidad, v.bodega_desde && `Desde ${v.bodega_desde}`].filter(Boolean);
    app.innerHTML = `
      <div class="bar">
        <button class="back" id="volver">← ${esc(col.nombre)}</button>
        <span class="eyebrow">Fila ${esc(v.fila)}</span>
      </div>
      <header class="head">
        <span class="eyebrow">${ids.length} ${ids.length === 1 ? "vino" : "vinos"}</span>
        ${v.bodega_logo ? `<h1 class="logo-bodega"><img src="${esc(v.bodega_logo)}" alt="${esc(v.bodega)}"></h1>` : `<h1>${esc(v.bodega || "Otros vinos")}</h1>`}
        ${datos.length ? `<div class="facts">${datos.map(d => `<span>${esc(d)}</span>`).join("")}</div>` : ""}
        ${v.bodega_historia ? `<details class="story"><summary>Conocé la bodega</summary><p>${esc(v.bodega_historia)}</p>
          ${/^https?:\/\//.test(v.bodega_web) ? `<a href="${esc(v.bodega_web)}" target="_blank" rel="noopener">Visitar la web de la bodega →</a>` : ""}</details>` : ""}
      </header>
      ${lineas.map(l => `
        <section class="linea">
          <h2>${esc(l.nombre)}</h2>
          <div class="grid">
            ${l.ids.map(id => { const w = VINOS[id]; return `
              <button class="card" data-id="${esc(id)}">
                <span class="thumb" data-thumb="${esc(id)}">${miniatura(id)}</span>
                <span class="card-txt"><strong>${esc(w.varietal || w.nombre)}</strong>${precio(w) || (w.cosecha ? `<span class="meta">${esc(w.cosecha)}</span>` : "")}</span>
              </button>`; }).join("")}
          </div>
        </section>`).join("")}
      <p class="foot">¿Dudas? Consultá al personal del local, te ayudamos a elegir.</p>`;
    document.getElementById("volver").onclick = () => { location.hash = "col-" + col.id; };
    app.querySelectorAll(".card").forEach(b => b.onclick = () => { location.hash = "vino-" + b.dataset.id; });
    window.scrollTo(0, 0);
  }

  function vistaVino(id){
    const v = VINOS[id], col = colDe(id);
    document.title = `${v.nombre} · ${CONFIG.local}`;
    const ficha = [["Cepa", v.varietal], ["Cosecha", v.cosecha], ["Altitud", v.altitud], ["Alcohol", v.alcohol], ["Crianza", v.crianza], ["Servir a", v.servir_a]]
      .filter(f => f[1]);
    const notas = [["Vista", v.vista], ["Nariz", v.nariz], ["Boca", v.boca]].filter(n => n[1]);
    const datosBodega = [v.bodega_ubicacion, v.bodega_especialidad, v.bodega_desde && `Desde ${v.bodega_desde}`].filter(Boolean);
    app.innerHTML = `
      <div class="bar">
        <button class="back" id="volver">← ${esc(v.bodega || col.nombre)}</button>
        <span class="eyebrow">${esc(col.nombre)} · Fila ${esc(v.fila)}</span>
      </div>
      <div class="stage" id="stage"><span class="hint eyebrow">Arrastrá para girar</span>
        <button class="zoom" id="zoom" type="button" aria-pressed="false">Acercar etiqueta</button></div>
      <div class="title">
        ${v.bodega ? `<span class="eyebrow">${esc(v.bodega)}</span>` : ""}
        <h1>${esc(v.nombre)}</h1>
        <span class="sub">${[v.varietal, v.cosecha, v.region].filter(Boolean).map(esc).join(" · ")}</span>
        ${precio(v)}
        ${v.ejemplo ? `<span class="sample">Contenido de ejemplo</span>` : ""}
      </div>
      ${v.descripcion ? `<p class="lead">${esc(v.descripcion)}</p>` : ""}
      ${ficha.length ? `<dl class="spec">${ficha.map(f => `<div><dt>${f[0]}</dt><dd>${esc(f[1])}</dd></div>`).join("")}</dl>` : ""}
      ${notas.length ? `<section class="sec"><h2>Notas de cata</h2><div class="notes">
        ${notas.map(n => `<div class="note"><span class="eyebrow">${n[0]}</span><p>${esc(n[1])}</p></div>`).join("")}
      </div></section>` : ""}
      ${v.maridaje.length ? `<section class="sec"><h2>Va bien con</h2>
        <div class="pair">${v.maridaje.map(m => `<span>${esc(m)}</span>`).join("")}</div></section>` : ""}
      ${v.bodega ? `<section class="sec"><h2>La bodega</h2>
        <div class="winery">
          <h3>${esc(v.bodega)}</h3>
          ${datosBodega.length ? `<div class="facts">${datosBodega.map(d => `<span>${esc(d)}</span>`).join("")}</div>` : ""}
          ${v.bodega_historia ? `<p>${esc(v.bodega_historia)}</p>` : ""}
          ${/^https?:\/\//.test(v.bodega_web) ? `<a href="${esc(v.bodega_web)}" target="_blank" rel="noopener">Visitar la web de la bodega →</a>` : ""}
        </div></section>` : ""}`;
    document.getElementById("volver").onclick = () => { location.hash = "bod-" + bodegaId(v); };
    window.scrollTo(0, 0);
    const stage = document.getElementById("stage");
    if (!Botella3D.disponible()){
      stage.querySelector(".hint").hidden = true;
      document.getElementById("zoom").hidden = true;
      stage.insertAdjacentHTML("beforeend", `<div class="nogl">Este teléfono no puede mostrar la vista 3D.</div>`);
      return;
    }
    const zb = document.getElementById("zoom");
    Botella3D.alZoom(cerca => {
      zb.textContent = cerca ? "Alejar" : "Acercar etiqueta"; zb.setAttribute("aria-pressed", cerca);
      stage.querySelector(".hint").textContent = cerca ? "Arrastrá para recorrer" : "Arrastrá para girar";
    });
    zb.onclick = () => Botella3D.alternarZoom();
    Botella3D.mostrar(stage, v);
  }

  function ruta(){
    const h = decodeURIComponent(location.hash.slice(1));
    if (h.startsWith("vino-") && VINOS[h.slice(5)]) return vistaVino(h.slice(5));
    if (h.startsWith("bod-") && vinosDeBodega(h.slice(4)).length) return vistaBodega(h.slice(4));
    const col = COLUMNAS.find(c => "col-" + c.id === h) || COLUMNAS[0];
    if (!col){ app.innerHTML = `<p class="empty">Todavía no hay columnas cargadas.</p>`; return; }
    vistaColumna(col);
  }
  addEventListener("hashchange", ruta);
  addEventListener("resize", () => Botella3D.ajustar(document.getElementById("stage")));
  if (document.fonts) await document.fonts.ready;
  ruta();

  // Miniaturas de la lista, generadas con la misma botella 3D
  for (const id of Object.keys(VINOS)){
    const url = await Botella3D.miniatura(VINOS[id]);
    if (!url) break;
    thumbs[id] = url;
    app.querySelectorAll(`[data-thumb="${CSS.escape(id)}"]`).forEach(slot => { slot.innerHTML = `<img src="${url}" alt="">`; });
  }
})();
