import string
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Setup
font_path = "/System/Library/Fonts/Helvetica.ttc"
font_size = 800
font = ImageFont.truetype(font_path, font_size)
letters = string.ascii_lowercase  # Generates 'a' through 'z'

for letter in letters:
    # Create a base image (Black background)
    img = Image.new('L', (1024, 1024), color=0)
    
    # --- ACCURATE SHADOW BLOCK ---
    # Create a separate layer for the shadow to ensure high quality
    shadow_img = Image.new('L', (1024, 1024), color=0)
    shadow_draw = ImageDraw.Draw(shadow_img)
    # Offset the shadow slightly (e.g., 10px down and right)
    shadow_draw.text((522, 522), letter, fill=100, font=font, anchor="mm")
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(radius=15))
    # Combine shadow with base
    img = Image.eval(shadow_img, lambda x: x) 
    # -----------------------------

    # Draw the main letter on top
    draw = ImageDraw.Draw(img)
    draw.text((512, 512), letter, fill=255, font=font, anchor="mm")
    
    # Save the result
    img.save(f"{letter}.png")

print(f"Successfully generated {len(letters)} images.")