# Recorta la etiqueta de una foto de frente de la botella y corrige la curvatura del cilindro.
# Uso: python3 desenrollar_etiqueta.py FOTO SALIDA.jpg Y_ARRIBA Y_ABAJO [CENTRO_X RADIO_X]
#   Y_ARRIBA / Y_ABAJO: bordes de la etiqueta en píxeles.
#   CENTRO_X / RADIO_X: eje y medio ancho de la botella; si faltan se detectan sobre fondo blanco.
import sys, math
from PIL import Image
import numpy as np

foto, salida, y0, y1 = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(foto).convert("RGB")
a = np.asarray(im).astype(float)
if len(sys.argv) > 6:
    cx, R = float(sys.argv[5]), float(sys.argv[6])
else:
    fila = a[(y0 + y1) // 2]
    osc = np.where(fila.sum(1) < 600)[0]
    cx, R = (osc.min() + osc.max()) / 2, (osc.max() - osc.min()) / 2

tm = 1.30  # radianes visibles a cada lado; más allá la foto está demasiado comprimida
H = y1 - y0
W = int(round(2 * tm * R))
src = a[y0:y1]
out = np.zeros((H, W, 3))
for j in range(W):
    x = cx + R * math.sin(-tm + 2 * tm * (j + 0.5) / W)
    x0 = int(math.floor(x)); fr = x - x0; x1 = min(x0 + 1, im.width - 1)
    out[:, j] = src[:, x0] * (1 - fr) + src[:, x1] * fr
o = Image.fromarray(out.clip(0, 255).astype(np.uint8))
escala = max(1, round(780 / W))
if escala > 1: o = o.resize((W * escala, H * escala), Image.LANCZOS)
if o.width > 1000: o = o.resize((1000, round(1000 * o.height / o.width)), Image.LANCZOS)
o.save(salida, quality=88)
print(salida, o.size)
