#!/usr/bin/env python3
"""
Generate gallery images for all 40 posts — visual + text pairs with watermarks.
Output: /sottotitoli-mobile/gallery/IG-01-visual.jpg, IG-01-caption.jpg, etc.
"""

from PIL import Image, ImageDraw, ImageFont
import json, os, re, textwrap

SIZE = 1080
OUT = os.path.expanduser("~/sottotitoli-mobile/gallery")
os.makedirs(OUT, exist_ok=True)

# Colors
DARK = (11, 21, 28)
CYAN = (14, 165, 233)
WHITE = (255, 255, 255)
MUTED = (120, 144, 156)
GOLD = (255, 200, 50)
RED = (200, 50, 50)

# Try to load fonts
FONT_TITLE = None
FONT_BODY = None
FONT_SMALL = None
for fp in ["/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/Supplemental/Arial.ttf",
           "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
    if os.path.exists(fp):
        try:
            FONT_TITLE = ImageFont.truetype(fp, 42)
            FONT_BODY = ImageFont.truetype(fp, 28)
            FONT_SMALL = ImageFont.truetype(fp, 20)
            FONT_WM = ImageFont.truetype(fp, 16)
            break
        except:
            pass
if not FONT_TITLE:
    FONT_TITLE = ImageFont.load_default()
    FONT_BODY = FONT_TITLE
    FONT_SMALL = FONT_TITLE
    FONT_WM = FONT_TITLE

def make_visual(post_id, platform, title, subtitle_en):
    """Create a cinematic visual placeholder image."""
    img = Image.new("RGB", (SIZE, SIZE), DARK)
    draw = ImageDraw.Draw(img)
    
    # Gradient-like background
    for y in range(SIZE):
        r = int(11 + (y/SIZE) * 8)
        g = int(21 + (y/SIZE) * 6)
        b = int(28 + (y/SIZE) * 4)
        draw.line([(0, y), (SIZE, y)], fill=(r, g, b))
    
    # Cyan accent bar
    draw.rectangle([(0, SIZE-160), (SIZE, SIZE)], fill=(10, 20, 30))
    draw.line([(0, SIZE-162), (SIZE, SIZE-162)], fill=CYAN, width=3)
    
    # Title at top
    if title:
        bbox = draw.textbbox((0, 0), title, font=FONT_TITLE)
        tw = bbox[2] - bbox[0]
        draw.text(((SIZE-tw)//2, 40), title, fill=WHITE, font=FONT_TITLE)
    
    # Platform indicator
    draw.text((30, 100), platform, fill=CYAN, font=FONT_SMALL)
    
    # Subtitle text at bottom
    if subtitle_en:
        lines = textwrap.wrap(subtitle_en, width=45)
        y = SIZE - 140
        for line in lines[:3]:
            draw.text((60, y), line, fill=WHITE, font=FONT_BODY)
            y += 36
    
    # Rating block
    rating_y = SIZE - 130
    draw.text((SIZE-200, rating_y), "★ ★ ★ ★ ☆", fill=GOLD, font=FONT_SMALL)
    
    # Watermark
    wm = f"sottotitoli.pro | {post_id}"
    draw.text((30, SIZE-30), wm, fill=MUTED, font=FONT_WM)
    
    return img

def make_caption(post_id, platform, username, caption_text, hashtags=""):
    """Create a text caption card."""
    img = Image.new("RGB", (SIZE, SIZE), DARK)
    draw = ImageDraw.Draw(img)
    
    # Platform header
    draw.rectangle([(0, 0), (SIZE, 80)], fill=(15, 28, 38))
    icons = {"instagram": "📸", "tiktok": "🎵", "x": "🐦", "snapchat": "👻"}
    icon = icons.get(platform, "📱")
    draw.text((30, 22), f"{icon} @{username} · {platform.upper()}", fill=CYAN, font=FONT_SMALL)
    
    # Pair ID badge
    draw.rectangle([(SIZE-150, 15), (SIZE-30, 65)], fill=CYAN)
    draw.text((SIZE-142, 26), post_id, fill=DARK, font=FONT_SMALL)
    
    # Caption text body
    clean = caption_text.replace("<br>", "\n")
    clean = clean.replace('\\"', '"')
    y = 110
    max_w = SIZE - 80
    for line in clean.split("\n"):
        line = line.strip()
        if not line:
            y += 20
            continue
        wrapped = textwrap.wrap(line, width=55)
        for wline in wrapped:
            if y > SIZE - 120:
                draw.text((40, y), "...", fill=MUTED, font=FONT_BODY)
                y = SIZE - 120
                break
            color = WHITE if not wline.startswith("#") else CYAN
            draw.text((40, y), wline, fill=color, font=FONT_BODY if not wline.startswith("#") else FONT_SMALL)
            y += 32
        y += 4
    
    # Hashtags at bottom
    if hashtags:
        y = max(y + 10, SIZE - 100)
        draw.text((40, y), hashtags, fill=CYAN, font=FONT_SMALL)
    
    # Footer
    draw.text((40, SIZE-30), f"sottotitoli.pro · Draft · {post_id}", fill=MUTED, font=FONT_WM)
    
    return img

# ===== MAIN =====
# Read posts from the HTML file
preview_path = os.path.expanduser("~/sottotitoli-mobile/post-previews.html")
content = open(preview_path).read()

# Extract the posts object using regex (simpler than full parse)
# Find const posts = { ... };
import re
match = re.search(r'const posts = ({.*?});', content, re.DOTALL)
if not match:
    print("Could not find posts in HTML")
    exit(1)

posts_str = match.group(1)
# Fix JS syntax to be valid JSON-like for parsing
posts_str = posts_str.replace("instagram:", '"instagram":')
posts_str = posts_str.replace("tiktok:", '"tiktok":')
posts_str = posts_str.replace("x:", '"x":')
posts_str = posts_str.replace("snapchat:", '"snapchat":')
posts_str = posts_str.replace("n:", '"n":')
posts_str = posts_str.replace("cap:", '"cap":')
posts_str = posts_str.replace("video:", '"video":')
posts_str = posts_str.replace("rating:", '"rating":')
posts_str = posts_str.replace("hashtags:", '"hashtags":')
posts_str = posts_str.replace("overall:", '"overall":')
posts_str = posts_str.replace("hook:", '"hook":')
posts_str = posts_str.replace("insight:", '"insight":')
posts_str = posts_str.replace("viral:", '"viral":')
posts_str = posts_str.replace("lang:", '"lang":')
posts_str = posts_str.replace("true", "True").replace("false", "False").replace("null", "None")

# Use eval safely (this is our own data, not user input)
try:
    posts_data = eval(posts_str)
except:
    print("Could not parse posts data")
    exit(1)

total = 0
platform_names = {"instagram": "IG", "tiktok": "TT", "x": "X", "snapchat": "SC"}
platform_usernames = {"instagram": "sottotitoli", "tiktok": "sottotitoli", "x": "sottotitoli_pro", "snapchat": "sottotitoli"}

for platform_key, posts in posts_data.items():
    plat_short = platform_names.get(platform_key, platform_key[:2].upper())
    username = platform_usernames.get(platform_key, "sottotitoli")
    
    for post in posts:
        n = post.get("n", 0)
        pid = f"{plat_short}-{n:02d}"
        cap = post.get("cap", "")
        hashtags = post.get("hashtags", "")
        
        # Determine title based on content
        title = "SOTTOTITOLI"
        if "Godfather" in cap or "Padrino" in cap:
            title = "THE GODFATHER"
        elif "Pulp Fiction" in cap:
            title = "PULP FICTION"
        elif "Mamma mia" in cap:
            title = "MAMMA MIA"
        elif "Boh" in cap and len(cap) < 200:
            title = "BOH."
        elif "carbonara" in cap.lower():
            title = "CARBONARA"
        
        subtitle = cap.split("<br>")[0].strip() if cap else ""
        if len(subtitle) > 100:
            subtitle = subtitle[:97] + "..."
        
        # Create visual image
        vis = make_visual(pid, platform_key.upper(), title, subtitle)
        vis_path = os.path.join(OUT, f"{pid}-visual.jpg")
        vis.save(vis_path, "JPEG", quality=85)
        
        # Create caption image
        cap_img = make_caption(pid, platform_key, username, cap, hashtags)
        cap_path = os.path.join(OUT, f"{pid}-caption.jpg")
        cap_img.save(cap_path, "JPEG", quality=85)
        
        total += 2
        print(f"✅ {pid}: visual + caption")

print(f"\n🎉 {total} images created in {OUT}")
