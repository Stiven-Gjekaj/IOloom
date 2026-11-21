"""Draw the IOloom logo as SVG.

Usage: python3 scripts/logo.py <colour> <output.svg>

assets/logo.svg uses #0b1f2a. assets/logo-dark.svg uses #e6f6fa.
"""
import math, sys
ink = sys.argv[1]; out = sys.argv[2]
C = 256
def gear(teeth, r_out, r_root, frac=0.5):
    pts = []; step = 2*math.pi/teeth
    for i in range(teeth):
        a0 = i*step - math.pi/2; w = step*frac/2
        for a, r in [(a0 - w*1.35, r_root), (a0 - w*0.85, r_out), (a0 + w*0.85, r_out), (a0 + w*1.35, r_root)]:
            pts.append((C + r*math.cos(a), C + r*math.sin(a)))
    return 'M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in pts) + ' Z'
def circle(r, cw=True):
    s = 1 if cw else 0
    return f'M{C} {C-r} A{r} {r} 0 1 {s} {C} {C+r} A{r} {r} 0 1 {s} {C} {C-r} Z'
body = gear(20, 244, 214) + ' ' + circle(188, False)
r = 98; sw = 44; g = 14   # ring radius, stroke, weave gap
top, bot = C - r, C + r
iy1, iy2 = C - 150, C + 150
cut = sw/2 + g
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="IOloom">
  <title>IOloom</title>
  <!-- A gear for the machine. Inside it, an I and an O weave over and under
       each other, as threads do on a loom: the inputs and outputs of a PLC,
       linked. -->
  <defs>
    <!-- The O passes under the I at the top. -->
    <mask id="o-under" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
      <rect width="512" height="512" fill="#fff"/>
      <rect x="{C-cut}" y="{top-sw}" width="{2*cut}" height="{2*sw}" fill="#000"/>
    </mask>
    <!-- The I passes under the O at the bottom. -->
    <mask id="i-under" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
      <rect width="512" height="512" fill="#fff"/>
      <rect x="{C-sw}" y="{bot-cut}" width="{2*sw}" height="{2*cut}" fill="#000"/>
    </mask>
  </defs>
  <path d="{body}" fill="{ink}" fill-rule="evenodd"/>
  <circle cx="{C}" cy="{C}" r="{r}" fill="none" stroke="{ink}" stroke-width="{sw}" mask="url(#o-under)"/>
  <path d="M{C} {iy1} V{iy2}" fill="none" stroke="{ink}" stroke-width="{sw}" stroke-linecap="round" mask="url(#i-under)"/>
</svg>
'''
open(out, 'w').write(svg)
