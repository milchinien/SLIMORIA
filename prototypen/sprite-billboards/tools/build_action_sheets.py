"""Export every animation as a padded, tightly cropped horizontal strip."""

import json
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUTPUT = ASSETS / "animations"
FRAMES = 12
PADDING = 24

DIRECTIONS = ("back", "back-right", "right", "front-right", "front", "front-left", "left", "back-left")

def cells(image, cols, rows):
    cell_w, cell_h = image.width // cols, image.height // rows
    return [[image.crop((x*cell_w,y*cell_h,(x+1)*cell_w,(y+1)*cell_h)) for x in range(cols)] for y in range(rows)]

def opaque_box(image):
    return image.getchannel("A").getbbox()

def primary_subject(frame):
    """Remove disconnected atlas bleed while preserving the main animated figure."""
    alpha = frame.getchannel("A")
    solid = alpha.point(lambda value: 255 if value >= 16 else 0).filter(ImageFilter.MaxFilter(5))
    width, height = solid.size
    pixels = solid.tobytes()
    seen = bytearray(width * height)
    largest = []
    for start, value in enumerate(pixels):
        if not value or seen[start]:
            continue
        seen[start] = 1
        component = []
        stack = [start]
        while stack:
            index = stack.pop()
            component.append(index)
            x, y = index % width, index // width
            for neighbour in (index - 1 if x else -1, index + 1 if x + 1 < width else -1,
                              index - width if y else -1, index + width if y + 1 < height else -1):
                if neighbour >= 0 and pixels[neighbour] and not seen[neighbour]:
                    seen[neighbour] = 1
                    stack.append(neighbour)
        if len(component) > len(largest):
            largest = component
    mask_data = bytearray(width * height)
    for index in largest:
        mask_data[index] = 255
    mask = Image.frombytes("L", (width, height), bytes(mask_data)).filter(ImageFilter.MaxFilter(9))
    cleaned = frame.copy()
    cleaned.putalpha(ImageChops.multiply(alpha, mask))
    return cleaned

def strip(frames, destination):
    frames=[primary_subject(frame) for frame in frames]
    boxes=[box for frame in frames if (box:=opaque_box(frame))]
    left=min(box[0] for box in boxes); top=min(box[1] for box in boxes)
    right=max(box[2] for box in boxes); bottom=max(box[3] for box in boxes)
    width=right-left+PADDING*2; height=bottom-top+PADDING*2
    output=Image.new("RGBA",(width*len(frames),height))
    for index,frame in enumerate(frames):
        cropped=frame.crop((left,top,right,bottom))
        output.alpha_composite(cropped,(index*width+PADDING,PADDING))
    destination.parent.mkdir(parents=True,exist_ok=True)
    output.save(destination,optimize=True)
    return {"src":destination.relative_to(ROOT).as_posix(),"cols":len(frames),"cellWidth":width,"cellHeight":height,"padding":PADDING}

def main():
    manifest={"frameCount":FRAMES,"padding":PADDING,"slime":{},"wolf":{},"boar":{}}
    directional=cells(Image.open(ASSETS/"slime-directional-8x12.png").convert("RGBA"),12,16)
    for direction,row in zip(DIRECTIONS,directional[:8]):
        manifest["slime"][f"idle-{direction}"]=strip([row[0]]*FRAMES,OUTPUT/"slime"/f"idle-{direction}.png")
        manifest["slime"][f"move-{direction}"]=strip(row,OUTPUT/"slime"/f"move-{direction}.png")
    for direction,row in zip(DIRECTIONS,directional[8:]):
        manifest["slime"][f"attack-{direction}"]=strip(row,OUTPUT/"slime"/f"attack-{direction}.png")

    slime=cells(Image.open(ASSETS/"slime-atlas.png").convert("RGBA"),6,6)
    for state,row_index in (("hit",3),("eat",4),("death",5)):
        frames=[]
        for index in range(FRAMES):
            source=round(index*(len(slime[row_index])-1)/(FRAMES-1))
            frames.append(slime[row_index][source])
        manifest["slime"][state]=strip(frames,OUTPUT/"slime"/f"{state}.png")

    for creature in ("wolf","boar"):
        rows=cells(Image.open(ASSETS/f"{creature}-atlas-12.png").convert("RGBA"),12,5)
        for state,row in zip(("idle","move","attack","hit","death"),rows):
            manifest[creature][f"{state}-right"]=strip(row,OUTPUT/creature/f"{state}-right.png")
            manifest[creature][f"{state}-left"]=strip([ImageOps.mirror(frame) for frame in row],OUTPUT/creature/f"{state}-left.png")

    (OUTPUT/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")

if __name__ == "__main__": main()
