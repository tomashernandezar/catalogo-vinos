# Redibuja en limpio las contraetiquetas de texto de Caelum (Reserva y Terruño) a partir de lo que dice la etiqueta real.
# Uso: python3 herramientas/contraetiquetas.py   → escribe img/etiquetas/<id>-contra.jpg
# Necesita Playwright con Chromium. El texto sale de la tabla VINOS de abajo (copiado de las fotos de cada botella).
import base64, html, os, subprocess, sys, tempfile, json
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARCA = os.path.join(RAIZ, "img", "bodegas", "caelum.png")

HISTORIA = ("Caelum es una pequeña constelación que puede ser observada desde el hemisferio sur. "
            "En ella se ve representada la herramienta del escultor, el cincel. Como el cincel para el escultor, "
            "las manos son para nosotros la herramienta de elaboración de nuestros vinos.")
DIRECCION = "Producto de Argentina. Elaborado y envasado por Bodega Caelum B-73561 Ruta Nacional N°7, Km 1062, Agrelo, Luján de Cuyo, Mendoza. Argentina."
SEDIMENTOS = "Esta botella puede presentar pequeños sedimentos. Estos no afectan la calidad del vino."

VINOS = [
  dict(id="caelum-reserva-malbec", linea="reserva", fondo="#7e2530", tinta="#f6ecdf", detalle="#e2574a",
       varietal="Malbec", cosecha="2018", tipo="Vino tinto", alc="14,6", invm="0002052324", lote="MBR18/37/18", ean="779815751014",
       datos=[("Composición", "Malbec 100%"), ("Viñedos", "A 1000 msnm."), ("Crianza", "12 meses en barrica de roble francés."),
              ("Notas de cata", "De color rubí con reflejos violáceos y aromas frutales como el arándano y la ciruela. En boca resulta redondo, de entrada amplia y untuosa. Se presenta fresco y opulento al mismo tiempo gracias a sus taninos dulces y una buena acidez."),
              ("Potencial de guarda", "Diez años.")]),
  dict(id="caelum-reserva-cabernet", linea="reserva", fondo="#34419a", tinta="#f3ecd6", detalle="#5d86d6",
       varietal="Cabernet Sauvignon", cosecha="2019", tipo="Vino tinto", alc="14,1", invm="0002093650", lote="CSR19/30/19", ean="779815751015",
       datos=[("Composición", "Cabernet Sauvignon 100%"), ("Viñedos", "A 1000 msnm."), ("Crianza", "12 meses en barricas de roble francés."),
              ("Notas de cata", "De color rojo rubí intenso, presenta una nariz muy compleja con aromas a frutos rojos, pimienta negra y notas minerales. En boca se distingue por su cuerpo y estructura, sus taninos dulces y larga persistencia."),
              ("Potencial de guarda", "Diez años.")]),
  dict(id="caelum-reserva-blanco", linea="reserva", fondo="#c4913f", tinta="#fbf4e4", detalle="#f0c040",
       varietal="Blend Blanco", cosecha="2023", tipo="Vino blanco", alc="14,7", invm="0002042452", lote="BBR23/47/23", ean="779815751016",
       datos=[("Composición", "50% Fiano - 45% Chardonnay - 5% Sauvignon Blanc."), ("Viñedos", "A 1000 msnm."), ("Crianza", "8 meses en barrica de roble francés."),
              ("Notas de cata", "Vino con aromas a flores blancas y notas minerales, que combinan la elegancia del Fiano, la estructura del Chardonnay y los aromas del Sauvignon Blanc. En boca es amable y fresco, convirtiéndose en un vino ideal para beber solo o para acompañar algún plato de verano."),
              ("Potencial de guarda", "Tres años.")]),
  dict(id="caelum-terruno-malbec", linea="terruno", varietal="Malbec", cosecha="2022", tipo="Vino tinto", alc="15,2", invm="0002052489", lote="MBJ22/44/22", ean="779815751003",
       datos=[("Composición", "Malbec 100%"), ("Cosecha", "Manual"), ("Viñedos", "Luján de Cuyo. 1000 msnm."),
              ("Notas de cata", "Vino tinto profundo de color rojo rubí con reflejos violáceos, aromas frutales como frutos rojos y ciruelas frescas. En boca se presenta elegante, untuoso, y de larga persistencia.")]),
  dict(id="caelum-terruno-cabernet", linea="terruno", varietal="Cabernet Sauvignon", cosecha="2022", tipo="Vino tinto", alc="15", invm="0001956721", lote="CSJ22/43/22", ean="779815751004",
       datos=[("Composición", "Cabernet Sauvignon 100%"), ("Cosecha", "Manual"), ("Viñedos", "Luján de Cuyo. 1000 msnm."),
              ("Notas de cata", "Vino tinto de color rojo rubí con reflejos morados. Aromas a frutas rojas maduras con final a pimienta negra. En boca se distingue por su entrada amplia y su estructura.")]),
  dict(id="caelum-terruno-chardonnay", linea="terruno", varietal="Chardonnay", cosecha="2022", tipo="Vino blanco", alc="13,5", invm="0001956713", lote="CHJ22/39/22", ean="779815751002",
       datos=[("Composición", "Chardonnay 100%"), ("Cosecha", "Manual"), ("Viñedos", "Luján de Cuyo. 1000 msnm."),
              ("Notas de cata", "De color dorado con reflejos verdosos, presenta una nariz muy compleja que va de la lima a notas minerales pasando por frutas tropicales. Vino bien estructurado, fresco y complejo.")]),
]

# ---------- código de barras EAN-13 ----------
L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"]
G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"]
R = ["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"]
PAR = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"]

def ean13(d12):
    s = sum(int(c) * (3 if i % 2 else 1) for i, c in enumerate(d12))
    d = d12 + str((10 - s % 10) % 10)
    bits = "101" + "".join((L if p == "L" else G)[int(c)] for p, c in zip(PAR[int(d[0])], d[1:7])) + "01010" + "".join(R[int(c)] for c in d[7:]) + "101"
    return d, bits

def barras_svg(d12, color, vertical):
    d, bits = ean13(d12)
    largo = [i < 3 or 45 <= i < 50 or i >= 92 for i in range(95)]
    rects = "".join(f'<rect x="{i + 9}" y="0" width="1" height="{56 if largo[i] else 50}"/>' for i, b in enumerate(bits) if b == "1")
    txt = (f'<text x="4" y="64">{d[0]}</text><text x="14" y="64" textLength="40">{d[1:7]}</text>'
           f'<text x="60" y="64" textLength="40">{d[7:]}</text>')
    g = f'<g fill="{color}" font-family="Inter" font-size="9">{rects}{txt}</g>'
    if vertical:
        return f'<svg viewBox="0 0 66 112" preserveAspectRatio="none"><g transform="translate(66 0) rotate(90)">{g}</g></svg>'
    return f'<svg viewBox="0 0 112 66" preserveAspectRatio="none">{g}</svg>'

# ---------- íconos legales ----------
def sello(color):
    return f'''<svg viewBox="0 0 100 100"><g fill="none" stroke="{color}">
      <circle cx="50" cy="50" r="46" stroke-width="5" stroke-dasharray="60 6 40 4"/><circle cx="50" cy="50" r="27" stroke-width="3"/></g>
      <defs><path id="arA" d="M17 50a33 33 0 0 1 66 0"/><path id="arB" d="M14 50a36 36 0 0 0 72 0"/></defs>
      <g fill="{color}" font-family="Inter" font-weight="800" font-size="10.5"><text><textPath href="#arA" startOffset="50%" text-anchor="middle">VINO ARGENTINO</textPath></text>
      <text font-size="8.5"><textPath href="#arB" startOffset="50%" text-anchor="middle" dy="8">BEBIDA NACIONAL</textPath></text>
      <g transform="translate(50 52)"><circle r="4.6" cx="-6" cy="-4" fill="none" stroke="{color}" stroke-width="2.4"/><circle r="4.6" cx="4" cy="-4" fill="none" stroke="{color}" stroke-width="2.4"/>
      <circle r="4.6" cx="-1" cy="5" fill="none" stroke="{color}" stroke-width="2.4"/><circle r="4.6" cx="9" cy="5" fill="none" stroke="{color}" stroke-width="2.4"/>
      <circle r="4.6" cx="4" cy="14" fill="none" stroke="{color}" stroke-width="2.4"/><path d="M2 -10 q6 -8 14 -6" fill="none" stroke="{color}" stroke-width="2.4"/></g></g></svg>'''

def embarazada(color):
    return f'''<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="{color}" stroke-width="6"/>
      <g fill="{color}"><circle cx="50" cy="24" r="8"/><path d="M42 34 q8 -3 15 1 l3 12 q12 6 9 20 q-3 10 -14 9 l2 14 h-17 l1 -20 q-3 -12 -1 -24z"/>
      <path d="M57 38 l10 -6 q4 -2 5 1 l-2 3 l-11 7z"/></g>
      <path d="M22 18 L82 80" stroke="{color}" stroke-width="7"/><path d="M18 22 L78 84" stroke="#0000" stroke-width="0"/></svg>'''

def marca_b64():
    im = Image.open(MARCA).crop((95, 15, 410, 165))
    im = im.crop(im.getchannel("A").getbbox())
    p = tempfile.mktemp(suffix=".png"); im.save(p)
    return base64.b64encode(open(p, "rb").read()).decode()

def e(t): return html.escape(t)

def pagina(v, marca):
    datos = "".join(f'<p><b>{e(k.upper())}:</b> {e(t)}</p>' for k, t in v["datos"])
    legal_alc = f'{v["tipo"].upper()} - ALC. {v["alc"]}% V/V - CONT. NETO 750 ML.'
    if v["linea"] == "reserva":
        tinta, fondo = v["tinta"], v["fondo"]
        W, H = 1500, 1820
        cuerpo = f'''
        <div class="top">
          <div class="izq"><div class="marca"></div><div class="wm">CAELUM</div><div class="sub">RESERVA</div>
            <div class="col"><div class="var">{e(v["varietal"].upper()).replace(" ", "<br>")}<br>{v["cosecha"]}</div></div></div>
          <div class="der"><p class="hist">{e(HISTORIA)}</p><div class="datos">{datos}</div></div>
        </div>
        <p class="sed">{e(SEDIMENTOS.upper())}</p>
        <div class="regla"></div><p class="web">www.bodegacaelum.com.ar</p><div class="regla"></div>
        <p class="alc">{e(legal_alc)}<br>INVM-{v["invm"]} - LOTE: {e(v["lote"])}.</p><div class="regla"></div>
        <div class="pie"><p class="dir">{e(DIRECCION.upper())}<br><br>CONTIENE SULFITOS<br>CONTAINS SULFITES</p>
          <div class="ico">{sello(tinta)}</div><div class="ico">{embarazada(tinta)}</div>
          <div class="ean">{barras_svg(v["ean"], "#111", False)}</div></div>
        <div class="regla"></div><p class="mod">BEBER CON MODERACIÓN. PROHIBIDA LA VENTA A MENORES DE 18 AÑOS.</p>'''
        css = f'''
        body{{background:{fondo};color:{tinta}}}
        .lbl{{padding:70px 70px 50px;background:
          radial-gradient(circle at 15% 40%, {v["detalle"]}22, transparent 30%), radial-gradient(circle at 85% 90%, #0002, transparent 40%), {fondo}}}
        .top{{display:flex;gap:44px}}
        .izq{{width:300px;text-align:center;flex:none}}
        .marca{{height:120px;background:{tinta};-webkit-mask:url(data:image/png;base64,{marca}) center/contain no-repeat}}
        .wm{{font:600 62px/1 Inter;letter-spacing:4px;margin-top:10px}}
        .sub{{font:400 34px/1 Inter;letter-spacing:12px;margin-top:10px}}
        .col{{border-right:3px solid {tinta};margin-top:40px;padding:30px 0;height:640px;
          background:repeating-radial-gradient(circle at 40% 60%, {v["detalle"]}55 0 3px, transparent 3px 22px)}}
        .var{{font:400 38px/1.25 Caladea;opacity:.95}}
        .der{{flex:1}}
        .hist{{font:italic 400 42px/1.32 Caladea;margin:0 0 26px}}
        .datos p{{font:400 41px/1.32 Caladea;margin:0 0 4px}}
        .datos b{{font-weight:700;letter-spacing:.5px}}
        .sed{{font:600 22px/1 "Liberation Sans";letter-spacing:-.4px;margin:24px 0 18px;white-space:nowrap}}
        .regla{{height:3px;background:{tinta};opacity:.85}}
        .web{{font:700 40px/1 Caladea;text-align:center;margin:18px 0;letter-spacing:1px}}
        .alc{{font:400 44px/1.25 "Liberation Sans";text-align:center;margin:20px 0;letter-spacing:-1px}}
        .pie{{display:flex;align-items:center;gap:36px;padding:28px 0}}
        .dir{{font:400 30px/1.2 "Liberation Sans";letter-spacing:-.5px;margin:0;width:470px}}
        .ico{{width:200px;height:200px;flex:none}} .ico svg{{width:100%;height:100%}}
        .ean{{background:#f4f1ea;padding:16px 18px 8px;width:330px;height:220px;margin-left:auto}} .ean svg{{width:100%;height:100%}}
        .mod{{font:400 26px/1 "Liberation Sans";margin:16px 0 0}}'''
    else:
        tinta, fondo = "#273a6b", "#efebe0"
        W, H = 1500, 2050
        cuerpo = f'''
        <div class="top"><div class="izq"><div class="marca"></div><div class="wm">CAELUM</div><div class="url">www.bodegacaelum.com.ar</div></div>
          <p class="hist">{e(HISTORIA)}</p></div>
        <div class="regla"></div>
        <h2>{e(v["varietal"].upper())} {v["cosecha"]}</h2>
        <div class="datos">{datos}</div>
        <div class="regla"></div><p class="dir">{e(DIRECCION.upper())}</p><div class="regla"></div>
        <p class="sed">{e(SEDIMENTOS.upper())}</p><div class="regla"></div>
        <div class="pie"><div class="lega"><p>ALC. {v["alc"]}% V/V<br>INVM-{v["invm"]}<br>LOTE: {e(v["lote"])}<br>{e(v["tipo"].upper())}<br>CONT. NETO 750 ML</p>
            <p class="sulf">CONTIENE SULFITOS<br>CONTAINS SULFITES</p><p class="mod">BEBER CON MODERACIÓN.<br>PROHIBIDA LA VENTA A<br>MENORES DE 18 AÑOS.</p></div>
          <div class="icos"><div class="ico">{sello(tinta)}</div><div class="ico">{embarazada(tinta)}</div></div>
          <div class="ean">{barras_svg(v["ean"], tinta, True)}</div></div>'''
        css = f'''
        body{{background:{fondo};color:{tinta}}}
        .lbl{{padding:80px 90px 60px;background:radial-gradient(circle at 30% 20%, #fff8, transparent 60%), {fondo}}}
        .top{{display:flex;gap:40px;align-items:flex-start}}
        .izq{{width:400px;flex:none;text-align:center;padding-top:30px}}
        .marca{{height:150px;background:{tinta};-webkit-mask:url(data:image/png;base64,{marca}) center/contain no-repeat}}
        .wm{{font:500 92px/1 Inter;letter-spacing:6px;margin-top:16px}}
        .url{{font:400 26px/1 Inter;margin-top:10px;letter-spacing:.2px}}
        .hist{{font:italic 400 49px/1.32 Caladea;margin:0}}
        .regla{{height:3px;background:{tinta};margin:26px 0}}
        h2{{font:700 50px/1 Inter;letter-spacing:9px;text-align:center;margin:10px 0 26px}}
        .datos p{{font:400 46px/1.4 Caladea;margin:0}}
        .datos b{{font:700 44px/1 "Liberation Sans";letter-spacing:-.5px}}
        .dir{{font:400 34px/1.3 "Liberation Sans";text-align:center;margin:0;letter-spacing:.5px}}
        .sed{{font:400 25px/1 "Liberation Sans";margin:0;white-space:nowrap;letter-spacing:-.3px}}
        .pie{{display:flex;gap:40px;align-items:flex-start}}
        .lega{{flex:1}} .lega p{{font:400 40px/1.25 "Liberation Sans";margin:0 0 14px;letter-spacing:-.5px}}
        .lega .sulf{{font-size:56px;line-height:1.05;border-bottom:3px solid {tinta};padding-bottom:12px}}
        .lega .mod{{font-size:36px}}
        .icos{{display:flex;flex-direction:column;gap:40px;padding-top:30px}}
        .ico{{width:250px;height:250px}} .ico svg{{width:100%;height:100%}}
        .ean{{width:300px;height:560px}} .ean svg{{width:100%;height:100%}}'''
    doc = f'''<!doctype html><html><head><meta charset="utf-8"><style>
      *{{box-sizing:border-box}} html,body{{margin:0}}
      .lbl{{width:{W}px;height:{H}px;overflow:hidden}}
      {css}</style></head><body><div class="lbl">{cuerpo}</div></body></html>'''
    return doc, W, H

def main():
    marca = marca_b64()
    tmp = tempfile.mkdtemp()
    trabajos = []
    for v in VINOS:
        if len(sys.argv) > 1 and v["id"] not in sys.argv[1:]: continue
        doc, W, H = pagina(v, marca)
        p = os.path.join(tmp, v["id"] + ".html"); open(p, "w").write(doc)
        trabajos.append(dict(html=p, png=os.path.join(tmp, v["id"] + ".png"), w=W, h=H, id=v["id"]))
    js = f'''const {{ chromium }} = require('playwright');
      (async () => {{ const b = await chromium.launch(); const p = await b.newPage();
        for (const t of {json.dumps(trabajos)}) {{ await p.setViewportSize({{width: t.w, height: t.h}});
          await p.goto('file://' + t.html); await p.waitForTimeout(150); await p.screenshot({{ path: t.png }}); }}
        await b.close(); }})();'''
    jp = os.path.join(tmp, "r.js"); open(jp, "w").write(js)
    npm = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()
    subprocess.run(["node", jp], check=True, env=dict(os.environ, NODE_PATH=npm))
    for t in trabajos:
        im = Image.open(t["png"]).convert("RGB")
        im = im.resize((1000, round(1000 * im.height / im.width)), Image.LANCZOS)
        dst = os.path.join(RAIZ, "img", "etiquetas", t["id"] + "-contra.jpg")
        im.save(dst, quality=92); print(dst, im.size)

main()
