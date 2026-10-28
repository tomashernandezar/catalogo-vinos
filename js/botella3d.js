/* Botella 3D: se modela por código (three.js) y se le pega la foto real de la etiqueta. */
(function(){
  // Perfiles de botella: [radio, altura]. "cuerpo" es el tramo recto donde va la etiqueta.
  const FORMAS = {
    bordelesa: { perfil: [[0,0],[0.35,0],[0.383,0.035],[0.385,1.9],[0.37,2.04],[0.3,2.18],[0.19,2.34],[0.14,2.48],[0.132,2.62],[0.132,2.98],[0.145,3.0],[0.145,3.06],[0,3.06]],
                 radio: 0.385, etiqueta: { centro: 1.22, alto: 1.0 }, alto: 3.06, cuello: 0.14 },
    "borgoña": { perfil: [[0,0],[0.39,0],[0.42,0.04],[0.42,1.55],[0.4,1.75],[0.33,2.05],[0.22,2.35],[0.15,2.55],[0.14,2.62],[0.14,2.98],[0.152,3.0],[0.152,3.06],[0,3.06]],
                 radio: 0.42, etiqueta: { centro: 0.74, alto: 1.0 }, alto: 3.06, cuello: 0.152 },
    alsaciana: { perfil: [[0,0],[0.3,0],[0.33,0.03],[0.33,1.55],[0.3,1.85],[0.22,2.25],[0.15,2.6],[0.125,2.85],[0.125,3.25],[0.138,3.27],[0.138,3.33],[0,3.33]],
                 radio: 0.33, etiqueta: { centro: 0.8, alto: 0.85 }, alto: 3.33, cuello: 0.138 }
  };
  FORMAS.borgona = FORMAS["borgoña"];

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lin = h => new THREE.Color(h || "#222").convertSRGBToLinear();

  function crearMotor(opts){
    let r;
    try { r = new THREE.WebGLRenderer(Object.assign({ antialias: true, alpha: true }, opts)); }
    catch (e) { return null; }
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0, 1.6, 8.4);
    camera.lookAt(0, 1.52, 0);

    // Entorno de estudio: fondo oscuro y dos "softbox" que dan los reflejos del vidrio
    const c = document.createElement("canvas"); c.width = 512; c.height = 256;
    const g = c.getContext("2d");
    const grd = g.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, "#5a5560"); grd.addColorStop(1, "#141216");
    g.fillStyle = grd; g.fillRect(0, 0, 512, 256);
    g.fillStyle = "#ffffff"; g.fillRect(96, 30, 34, 200); g.fillRect(352, 50, 14, 170);
    g.fillStyle = "#cfc6d6"; g.fillRect(230, 0, 60, 24);
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding;
    scene.environment = new THREE.PMREMGenerator(r).fromEquirectangular(t).texture;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a2f3a, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3, 5, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffeedd, 0.9); rim.position.set(-4, 3, -3); scene.add(rim);
    return { r, scene, camera };
  }

  // Etiqueta dibujada, para vinos que todavía no tienen foto
  function etiquetaDibujada(v){
    const W = 740, H = 960, c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const fondo = "#f2ede4", tinta = "#2a1d22", acento = v.color_capsula || "#6d1630";
    g.fillStyle = fondo; g.fillRect(0, 0, W, H);
    g.strokeStyle = acento; g.lineWidth = 4; g.strokeRect(40, 40, W - 80, H - 80);
    g.lineWidth = 1.5; g.strokeRect(54, 54, W - 108, H - 108);
    g.textAlign = "center"; g.fillStyle = acento;
    g.font = '500 30px "DM Mono", monospace';
    espaciado(g, (v.bodega || "").toUpperCase(), W / 2, 150, 6);
    g.fillStyle = tinta;
    let size = 150; g.font = `500 ${size}px "Bodoni Moda", Georgia, serif`;
    while (g.measureText(v.nombre).width > W - 150 && size > 60){ size -= 6; g.font = `500 ${size}px "Bodoni Moda", Georgia, serif`; }
    g.fillText(v.nombre, W / 2, 470);
    g.fillStyle = acento; g.fillRect(W / 2 - 50, 520, 100, 3);
    g.fillStyle = tinta; g.font = 'italic 500 52px "Bodoni Moda", Georgia, serif';
    g.fillText(v.varietal || "", W / 2, 610);
    g.font = '500 40px "DM Mono", monospace'; g.fillText(v.cosecha || "", W / 2, 700);
    g.font = '400 26px "DM Mono", monospace'; g.fillStyle = acento;
    espaciado(g, (v.region || "").toUpperCase(), W / 2, 840, 3);
    return c;
  }
  function espaciado(g, txt, x, y, sp){
    const w = [...txt].reduce((a, ch) => a + g.measureText(ch).width + sp, -sp);
    let cx = x - w / 2; const al = g.textAlign; g.textAlign = "left";
    for (const ch of txt){ g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; }
    g.textAlign = al;
  }

  function cargarImagen(src){
    return new Promise(ok => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => ok(null);
      img.src = src;
    });
  }

  async function crearBotella(motor, v){
    const F = FORMAS[(v.forma_botella || "").toLowerCase()] || FORMAS.bordelesa;
    const grp = new THREE.Group();
    const perfil = F.perfil.map(p => new THREE.Vector2(p[0], p[1]));
    grp.add(new THREE.Mesh(new THREE.LatheGeometry(perfil, 96),
      new THREE.MeshPhysicalMaterial({ color: lin(v.color_vidrio || "#1d2a1c"), roughness: 0.06, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.3 })));

    let fuente = v.foto_etiqueta ? await cargarImagen(v.foto_etiqueta) : null;
    if (!fuente) fuente = etiquetaDibujada(v);
    const tex = new THREE.Texture(fuente); tex.needsUpdate = true;
    tex.encoding = THREE.sRGBEncoding; tex.anisotropy = motor.r.capabilities.getMaxAnisotropy();
    const R = F.radio + 0.004, alto = F.etiqueta.alto;
    const aspecto = (fuente.naturalWidth || fuente.width) / (fuente.naturalHeight || fuente.height);
    const arco = Math.min(2.8, alto * aspecto / R);
    const etiqueta = new THREE.Mesh(new THREE.CylinderGeometry(R, R, alto, 96, 1, true, -arco / 2, arco),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0 }));
    etiqueta.position.y = F.etiqueta.centro; grp.add(etiqueta);

    const capsula = new THREE.Mesh(new THREE.CylinderGeometry(F.cuello + 0.004, F.cuello - 0.005, 0.46, 64),
      new THREE.MeshStandardMaterial({ color: lin(v.color_capsula || "#6d1630"), roughness: 0.35, metalness: 0.55 }));
    capsula.position.y = F.alto - 0.22; grp.add(capsula);

    // Centra la botella en cuadro, sin importar la forma
    const pivote = new THREE.Group();
    grp.position.y = 1.53 - F.alto / 2;
    pivote.add(grp);
    return pivote;
  }

  function liberar(o){
    o.traverse(m => {
      if (m.geometry) m.geometry.dispose();
      if (m.material){ if (m.material.map) m.material.map.dispose(); m.material.dispose(); }
    });
  }

  // ---------- API pública ----------
  let vista = null, mini = null, actual = null, raf = 0, token = 0;
  let rotY = 0, rotX = 0, velY = 0, arrastrando = false, lastX = 0, lastY = 0;

  function motorVista(){
    if (vista !== null) return vista;
    vista = window.THREE ? crearMotor() : null;
    if (!vista) return (vista = false);
    const cv = vista.r.domElement;
    cv.setAttribute("aria-label", "Botella en 3D. Arrastrá para girarla.");
    cv.addEventListener("pointerdown", e => { arrastrando = true; lastX = e.clientX; lastY = e.clientY; velY = 0; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
    cv.addEventListener("pointermove", e => {
      if (!arrastrando) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
      velY = dx * 0.012; rotY += velY;
      rotX = Math.max(-0.35, Math.min(0.35, rotX + dy * 0.004));
    });
    const soltar = () => { arrastrando = false; };
    cv.addEventListener("pointerup", soltar); cv.addEventListener("pointercancel", soltar);
    return vista;
  }

  function ajustar(stage){
    if (!vista || !stage) return;
    const w = stage.clientWidth, h = stage.clientHeight;
    vista.r.setSize(w, h, false); vista.camera.aspect = w / h; vista.camera.updateProjectionMatrix();
  }

  window.Botella3D = {
    disponible(){ return !!motorVista(); },

    async mostrar(stage, v){
      this.parar();
      const m = motorVista(); if (!m) return false;
      const yo = ++token;
      stage.prepend(m.r.domElement);
      ajustar(stage);
      const b = await crearBotella(m, v);
      if (yo !== token){ liberar(b); return true; }
      actual = b; m.scene.add(b);
      rotY = -0.35; rotX = 0; velY = 0;
      const tick = () => {
        if (!arrastrando){ rotY += velY; velY *= 0.94; if (Math.abs(velY) < 0.002 && !reduce) rotY += 0.005; rotX *= 0.94; }
        b.rotation.y = rotY; b.rotation.x = rotX;
        m.r.render(m.scene, m.camera);
        raf = requestAnimationFrame(tick);
      };
      tick();
      return true;
    },

    ajustar,

    parar(){
      token++;
      cancelAnimationFrame(raf);
      if (actual && vista){ vista.scene.remove(actual); liberar(actual); }
      actual = null;
    },

    async miniatura(v){
      if (mini === null) mini = window.THREE ? crearMotor({ preserveDrawingBuffer: true }) : null;
      if (!mini) { mini = false; return null; }
      const b = await crearBotella(mini, v); b.rotation.y = -0.25;
      mini.scene.add(b);
      mini.r.setSize(128, 200, false); mini.camera.aspect = 128 / 200; mini.camera.updateProjectionMatrix();
      mini.r.render(mini.scene, mini.camera);
      const url = mini.r.domElement.toDataURL("image/png");
      mini.scene.remove(b); liberar(b);
      return url;
    }
  };
})();
