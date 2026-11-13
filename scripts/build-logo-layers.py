import sys
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
SRC=sys.argv[1]; OUT=sys.argv[2]
im=Image.open(SRC).convert('RGBA'); arr=np.array(im); a=arr[:,:,3]
lab,n=ndi.label(a>40)
# étiquette propagée aux pixels de bord (anti-crénelage)
_,(iy,ix)=ndi.distance_transform_edt(lab==0,return_indices=True)
full=lab[iy,ix]; full[a==0]=0
def at(x,y): return int(lab[y,x])
D={at(225,150),at(300,283),at(425,325)}
S={at(390,150)}
I={at(535,75),at(540,160),at(540,275),at(530,40),at(600,100)}
assert 0 not in D|S|I,(D,S,I)
word=set()
for i,s in enumerate(ndi.find_objects(lab),1):
    if s[0].start>=380: word.add(i)
layers={'d':np.isin(full,list(D)),'s':np.isin(full,list(S)),'i':np.isin(full,list(I)),'word':np.isin(full,list(word))}
used=layers['d']|layers['s']|layers['i']|layers['word']
layers['ring']=(~used)&(a>0)
# pied du pilier du I fusionné avec l'ombre : tout ce qui est sous y>=349 va à l'anneau/ombre
yy=np.arange(a.shape[0])[:,None]*np.ones((1,a.shape[1]))
low=(yy>=349)&(yy<380)&(a>0)
layers['i']&=~low; layers['ring']|=low&~layers['word']
ys,xs=np.where(a>0); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
print('crop',x0,y0,x1,y1)
tot=np.zeros(a.shape,int)
for k,m in layers.items():
    tot+=m
    out=arr.copy(); out[~m]=0
    Image.fromarray(out).crop((x0,y0,x1,y1)).save(f'{OUT}/logo-{k}.png',optimize=True)
    print(k,int(m.sum()))
print('overlap/uncovered',int((tot>1).sum()),int(((tot==0)&(a>0)).sum()))
