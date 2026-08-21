"""Build denser animation atlases from the hand-authored six-frame sheets."""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"

def cells(image, cols, rows):
    width, height = image.width // cols, image.height // rows
    return [[image.crop((x*width, y*height, (x+1)*width, (y+1)*height)) for x in range(cols)] for y in range(rows)]

def expand_frames(row, count=12, loop=False):
    """Repeat clear authored poses without blending two whole silhouettes together."""
    result=[]
    for frame in range(count):
        position=frame*len(row)/count if loop else frame*(len(row)-1)/(count-1)
        source=min(len(row)-1,round(position))
        result.append(row[source].copy())
    return result

def save_grid(rows,path):
    cell_w,cell_h=rows[0][0].size
    sheet=Image.new("RGBA",(cell_w*len(rows[0]),cell_h*len(rows)))
    for y,row in enumerate(rows):
        for x,sprite in enumerate(row): sheet.alpha_composite(sprite,(x*cell_w,y*cell_h))
    sheet.save(path,optimize=True)

def expand_enemy(name):
    source=Image.open(ASSETS/f"{name}-atlas.png").convert("RGBA")
    source_rows=cells(source,6,5)
    save_grid([expand_frames(row,loop=index<2) for index,row in enumerate(source_rows)],ASSETS/f"{name}-atlas-12.png")

def expand_slime():
    source=Image.open(ASSETS/"slime-directional.png").convert("RGBA")
    source_rows=cells(source,6,8); result=[]
    # Existing order: back, right, front, left. Add one diagonal between each pair.
    for action_offset in (0,4):
        cardinal=[expand_frames(source_rows[action_offset+i],loop=action_offset==0) for i in range(4)]
        for index in range(4):
            result.append(cardinal[index])
            # A repeated cardinal view is visually stable; blending two directions creates ghost bodies.
            result.append([frame.copy() for frame in cardinal[index]])
    save_grid(result,ASSETS/"slime-directional-8x12.png")

if __name__ == "__main__":
    expand_slime(); expand_enemy("wolf"); expand_enemy("boar")
