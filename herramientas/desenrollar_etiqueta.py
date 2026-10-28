# Recorta la etiqueta de una foto de frente de la botella y corrige la curvatura del cilindro.
# Uso: editar "specs" (archivo: (id_del_vino, y_arriba, y_abajo) de la etiqueta) y correr:
#   python3 desenrollar_etiqueta.py ../img/etiquetas
import sys, math
from PIL import Image
import numpy as np
specs={ # file: (name, y0, y1)
 'a3f8553c-000.png':('caelum-gr-cabernet',352,612),
 '4b8fb6d1-000.png':('caelum-gr-fiano',509,764),
 'd16c7491-000.png':('caelum-gr-malbec',378,640),
 '75061281-000.png':('caelum-gr-pinot',518,786),
}
out=sys.argv[1]
for f,(name,y0,y1) in specs.items():
  im=Image.open(f).convert('RGB'); a=np.asarray(im).astype(int)
  ym=(y0+y1)//2
  row=a[ym]; dark=np.where(row.sum(1)<600)[0]
  L,Rr=dark.min(),dark.max(); cx=(L+Rr)/2; R=(Rr-L)/2
  tm=1.30  # radianes visibles a cada lado (evita los bordes muy comprimidos)
  H=y1-y0; W=int(round(2*tm*R))
  src=im.crop((0,y0,im.width,y1))
  o=Image.new('RGB',(W,H))
  sa=np.asarray(src); oa=np.zeros((H,W,3),dtype=np.uint8)
  for j in range(W):
    th=-tm+2*tm*(j+0.5)/W
    x=cx+R*math.sin(th)
    x0=int(math.floor(x)); fr=x-x0; x1=min(x0+1,im.width-1)
    oa[:,j]=(sa[:,x0]*(1-fr)+sa[:,x1]*fr).astype(np.uint8)
  o=Image.fromarray(oa)
  o=o.resize((W*3,H*3),Image.LANCZOS)
  o.save(f'{out}/{name}.jpg',quality=88)
  print(name,L,Rr,W,H, o.size)
