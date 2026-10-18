from PIL import Image, ImageDraw

S = 1024
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
lime = (200, 255, 61, 255)
ink = (16, 18, 8, 255)

draw.rounded_rectangle([0, 0, S - 1, S - 1], radius=220, fill=lime)
draw.rounded_rectangle([220, 260, 804, 700], radius=120, fill=ink)
draw.polygon([(360, 670), (280, 820), (500, 690)], fill=ink)
draw.polygon([(512, 340), (600, 480), (512, 620), (424, 480)], fill=lime)

img.resize((512, 512), Image.LANCZOS).save('build/icon.png')
print('wrote build/icon.png')
