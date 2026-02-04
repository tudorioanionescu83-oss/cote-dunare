from PIL import Image
import os
from pathlib import Path

# Config
MAX_WIDTH = 800
JPEG_QUALITY = 85
INPUT_DIR = "public/stations"
BACKUP_DIR = "public/stations/backup_original"

def optimize_image(image_path, output_path, max_width=MAX_WIDTH, quality=JPEG_QUALITY):
    try:
        img = Image.open(image_path)
        
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        width, height = img.size
        if width > max_width:
            ratio = max_width / width
            new_width = max_width
            new_height = int(height * ratio)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            print(f"  Resized: {width}x{height} -> {new_width}x{new_height}")
        
        img.save(output_path, 'JPEG', quality=quality, optimize=True)
        
        original_size = os.path.getsize(image_path)
        new_size = os.path.getsize(output_path)
        reduction = ((original_size - new_size) / original_size) * 100
        
        print(f"  Size: {original_size/1024:.0f} KB -> {new_size/1024:.0f} KB ({reduction:.1f}% reduction)")
        return True
    except Exception as e:
        print(f"  Error: {e}")
        return False

def main():
    print("="*80)
    print("OPTIMIZARE AUTOMATA IMAGINI STATII")
    print("="*80)
    
    extensions = ['*.jpg', '*.jpeg', '*.png']
    images = []
    for ext in extensions:
        images.extend(Path(INPUT_DIR).glob(ext))
    
    images = [img for img in images if 'backup' not in str(img) and img.name != 'default.jpg']
    
    if not images:
        print(f"\nNu s-au gasit imagini in {INPUT_DIR}")
        return
    
    print(f"\nGasite {len(images)} imagini de optimizat")
    Path(BACKUP_DIR).mkdir(parents=True, exist_ok=True)
    
    total_original = 0
    total_optimized = 0
    success_count = 0
    
    print(f"\n{'='*80}")
    print("Procesare...")
    print(f"{'='*80}\n")
    
    for img_path in sorted(images):
        print(f"{img_path.name}")
        
        backup_path = Path(BACKUP_DIR) / img_path.name
        if not backup_path.exists():
            import shutil
            shutil.copy2(img_path, backup_path)
            print(f"  Backup: OK")
        
        original_size = os.path.getsize(img_path)
        total_original += original_size
        
        if optimize_image(img_path, img_path):
            new_size = os.path.getsize(img_path)
            total_optimized += new_size
            success_count += 1
            print(f"  Status: Optimized\n")
        else:
            total_optimized += original_size
            print(f"  Status: Skipped\n")
    
    print(f"{'='*80}")
    print("RAPORT FINAL")
    print(f"{'='*80}")
    print(f"Imagini procesate:   {success_count}/{len(images)}")
    print(f"Dimensiune originala: {total_original/1024/1024:.2f} MB")
    print(f"Dimensiune finala:    {total_optimized/1024/1024:.2f} MB")
    
    if total_original > 0:
        reduction = ((total_original - total_optimized) / total_original) * 100
        saved = (total_original - total_optimized) / 1024 / 1024
        print(f"Spatiu economisit:    {saved:.2f} MB ({reduction:.1f}%)")
    
    print(f"\nBackup-uri salvate in: {BACKUP_DIR}")
    print(f"Imagini optimizate in: {INPUT_DIR}")

if __name__ == "__main__":
    main()
