"""Prepare lightweight, playable layers from the three original paintings.
Optional art build: python -m pip install pillow numpy opencv-python-headless
Run from the repository root. The game ships with the resulting files.
"""
from pathlib import Path
import cv2 as cv
import numpy as np
from PIL import Image

OUT = Path('assets')
(OUT / 'hero').mkdir(parents=True, exist_ok=True)

def save(im, name, quality=91):
    Image.fromarray(im).save(OUT / name, quality=quality, method=6)

# Isolate the seven running poses by connected component, including enclosed
# white costume details (never chroma-key the whites of the character's eyes).
sheet = np.array(Image.open('sprites_hero.png').convert('RGB'))
fg = (np.min(sheet, axis=2) < 224).astype('uint8')
_, labels, stats, _ = cv.connectedComponentsWithStats(fg, 8)
poses = sorted([i for i,s in enumerate(stats) if i and s[4] > 20000 and s[1] < 100], key=lambda i:stats[i][0])
for n,i in enumerate(poses):
    x,y,w,h,_ = stats[i]; x,y,w,h = map(int,(x,y,w,h))
    contour, _ = cv.findContours((labels[y:y+h,x:x+w] == i).astype('uint8'), cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    alpha = cv.drawContours(np.zeros((h,w), np.uint8), contour, -1, 255, cv.FILLED)
    im = Image.fromarray(np.dstack((sheet[y:y+h,x:x+w],alpha)))
    im.thumbnail((210,320),Image.Resampling.LANCZOS)
    im.save(OUT / f'hero/run-{n}.webp',quality=95,method=6)
    if n == 0:
        im.crop((20,1,im.width,178)).resize((164,164),Image.Resampling.LANCZOS).save(OUT / 'hero/portrait.webp', quality=94)

def restore(src, mask, radius, seamless=True):
    """Patch painted texture back into a hole, matching its surrounding edge."""
    mask = cv.dilate(mask, np.ones((3,3),np.uint8))
    out = src.copy()
    _, _, components, _ = cv.connectedComponentsWithStats(mask)
    smooth = cv.GaussianBlur(src,(0,0),1.2)
    for x,y,w,h,area in components[1:]:
        pad=max(5,min(13,min(w,h)//4)); l=max(0,x-pad); t=max(0,y-pad)
        r=min(src.shape[1],x+w+pad); b=min(src.shape[0],y+h+pad)
        template=smooth[t:b,l:r]; hh,ww=template.shape[:2]
        x1=max(0,l-radius); y1=max(0,t-radius); x2=min(src.shape[1],r+radius); y2=min(src.shape[0],b+radius)
        valid=(mask[t:b,l:r]==0).astype(np.uint8)
        if valid.sum()<5: continue
        cost=cv.matchTemplate(smooth[y1:y2,x1:x2],template,cv.TM_SQDIFF,mask=valid)/valid.sum()/3
        overlaps=cv.matchTemplate(mask[y1:y2,x1:x2],np.ones((hh,ww),np.uint8),cv.TM_CCORR)
        yy,xx=np.indices(cost.shape);cost+=(xx+x1-l)**2*.007+(yy+y1-t)**2*.008
        cost[overlaps>10]=1e9
        sy,sx=np.unravel_index(np.argmin(cost),cost.shape);sy+=y1;sx+=x1
        patch=src[sy:sy+hh,sx:sx+ww].copy()
        region=mask[t:b,l:r].copy()
        # Poisson blending keeps the luminance continuous across the repair.
        if seamless and l>0 and t>0 and r<src.shape[1] and b<src.shape[0]:
            out=cv.seamlessClone(patch,out,region,(x+w//2,y+h//2),cv.NORMAL_CLONE)
        else:
            blend=cv.GaussianBlur(region,(0,0),1.6).astype(np.float32)[:,:,None]/255.
            out[t:b,l:r]=np.clip(out[t:b,l:r]*(1-blend)+patch*blend,0,255).astype(np.uint8)
    return out

# A casting pose is separated in exactly the same way.
i=next(i for i,st in enumerate(stats) if i and st[1]>700 and st[0]<10 and st[4]>18000)
x,y,w,h,_=stats[i]; contours,_=cv.findContours((labels[y:y+h,x:x+w]==i).astype(np.uint8),cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE)
a=cv.drawContours(np.zeros((h,w),np.uint8),contours,-1,255,cv.FILLED)
save(np.dstack((sheet[y:y+h,x:x+w],a)),'hero/cast.webp',95)

# An atlas without baked-in HUD, coins, stars or an immovable duplicate hero.
world = np.array(Image.open('map_all.png').convert('RGB'))
mask = np.zeros(world.shape[:2], np.uint8)
for x,y in [(328,211),(145,219),(611,244),(757,243),(803,154),(946,230),(1059,207),(555,344),(143,400),(508,430),(658,420),(815,359),(932,448),(1101,394),(1265,319),(109,520),(222,614),(502,560),(873,543),(1249,487),(1175,567),(1150,643),(786,647),(428,651),(202,763),(335,750),(711,775),(934,709),(1009,685),(1239,759),(136,923),(163,1041),(339,1078),(588,1099),(756,965),(913,1064),(973,916),(1150,902)]:
    cv.ellipse(mask,(x,y),(16,10),0,0,360,255,-1)
for x,y in [(328,179),(611,211),(803,122),(555,313),(143,369),(508,398),(658,388),(815,327),(932,416),(1101,361),(1265,286),(109,486),(222,581),(873,512),(1249,455),(1150,610),(786,615),(428,619),(202,731),(335,718),(711,742),(934,677),(1239,726),(339,1045),(588,1067),(756,932),(913,1032),(973,885),(1150,870)]:
    cv.ellipse(mask,(x,y),(19,20),0,0,360,255,-1)
cv.fillPoly(mask,[np.array([(108,154),(119,138),(138,128),(159,131),(175,146),(174,170),(160,183),(162,207),(130,210),(126,190),(111,178)])],255)
cv.rectangle(mask,(18,10),(133,82),255,-1)
cv.fillPoly(mask,[np.array([(24,150),(87,144),(94,194),(63,201),(61,220),(50,219),(48,198),(20,197)])],255)
world = restore(world,mask,168,seamless=False)
save(world,'world.webp',94)

# Level geometry is authored in a 1250 × 833.25 coordinate system.
# Export at 2.4x resolution, so the camera can follow the hero without blur.
src = np.array(Image.open('Level1_map.png').convert('RGB'))

def extract(name,box,poly):
    x,y,w,h=box; a=src[y*4:(y+h)*4,x*4:(x+w)*4]; m=np.zeros(a.shape[:2],np.uint8)
    cv.fillPoly(m,[np.rint(np.array(poly)*4).astype(np.int32)],255,lineType=cv.LINE_AA)
    img=Image.fromarray(np.dstack((a,m))); img=img.crop(img.getbbox()); img.save(OUT / name,quality=96)
extract('slime-blue.webp',(144,289,40,34),[(8.7,23.7),(8.6,20),(10.1,16),(13.8,12.6),(17.3,10.6),(17.7,7.3),(19.4,6.1),(21.8,7.2),(22.7,10.8),(26.8,13.4),(29.8,17),(31.1,21.3),(30.9,24.8),(28.1,27),(24,28.4),(17,28.2),(12,27)])
extract('slime-rose.webp',(223,462,34,28),[(6,20),(6,16),(7.5,11),(10.8,7.5),(11,5.4),(13.5,5.2),(15,3),(17.8,2.8),(19.8,4.4),(19.8,6.6),(23.6,9.2),(26.3,13.3),(27.9,18.7),(28.1,21.4),(26.5,24),(22.7,25.6),(15.6,26.1),(10.4,25.1),(7.6,23)])
extract('coin.webp',(733,132,32,31),[(7.7,20),(7.6,14.4),(9,9.8),(11.8,6.6),(15.6,5.1),(19,5.9),(21.7,8.5),(23.3,12.8),(23.1,17.3),(21.6,20.8),(18.4,22.7),(14.2,23.2),(10.5,22.2)])
s = 2.4
level=cv.resize(src,(3000,2000),interpolation=cv.INTER_AREA)
mask=np.zeros(level.shape[:2],np.uint8)
def oval(x,y,rx,ry): cv.ellipse(mask,(round(x*s),round(y*s)),(round(rx*s),round(ry*s)),0,0,360,255,-1)
for x,y in [(242,231),(328,224),(349,224),(454,249),(541,173),(560,173),(749,146),(288,361),(943,313),(964,313),(467,487),(532,495),(555,495),(856,549),(467,691),(492,701),(689,717),(860,683)]: oval(x,y,9,11)
for x,y in [(163.5,307),(403,246.5),(1076,169),(1205,335.5),(354,580.5),(811,531.5),(1016,534.5),(519,724.5),(699,755),(240,477),(560,254),(761,588),(887,670)]:oval(x,y,13,12)
for x,y in [(206,151),(263,145),(410,122),(850,203),(984,158),(1102,150),(71,348),(662,379),(1083,319),(1015,308),(494,470),(377,534),(450,590),(692,582),(119,731),(710,716)]:oval(x,y,11,11)
for x,y in [(452,115),(715,103),(800,78),(886,634)]:oval(x,y,20,13)
# Remove the painted starting character; leave the original platforms intact.
poly=np.array([(77,139),(94,117),(112,108),(139,111),(154,124),(171,137),(173,167),(149,182),(139,200),(88,200),(76,174)])
cv.fillPoly(mask,[np.rint(poly*s).astype(np.int32)],255)
level=restore(level,mask,230)
# Replant the cleared starting shelf with foliage from the eastern island.
# This foreground patch hides the very large character's painted cast shadow.
x,y,w,h=[round(v*s) for v in (72,98,101,104)]
patch=cv.resize(src[400:900,4540:5000], (w,h), interpolation=cv.INTER_AREA)
yy,xx=np.indices((h,w)); u=xx/(w-1); v=yy/(h-1)
edge=np.minimum(np.minimum(u/.105,(1-u)/.115),np.minimum(v/.43,(1-v)/.032))
edge=np.minimum(edge, (1-u-.12*(1-v))/.11)
alpha=np.clip(edge,0,1)[:,:,None];alpha=alpha*alpha*(3-2*alpha)
level[y:y+h,x:x+w]=(level[y:y+h,x:x+w]*(1-alpha)+patch*alpha).astype(np.uint8)
save(level,'level.webp',91)
# The selected-level postcard is a real view of the playable landscape.
thumb = Image.fromarray(level).crop((150,145,1850,700)); thumb.thumbnail((820,270),Image.Resampling.LANCZOS);thumb.save(OUT/'forest-preview.webp',quality=92,method=6)
print('Game artwork ready.')
