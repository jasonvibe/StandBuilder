import os
import re
import shutil

# Configuration
SOURCE_DIR = '/Users/jasonmeng/Documents/Ai_Projects/数据库/体系库'
TARGET_DIR = '/Users/jasonmeng/Documents/Ai_Projects/数据库/体系库_Structured'

# Industry Mapping
INDUSTRY_MAP = {
    '东威科技': '制造业',
    '中建智地': '房地产业',
    '中海地产': '房地产业',
    '广州地铁地产': '房地产业',
    '星河地产': '房地产业',
    '深铁置业': '房地产业',
    '明康工程咨询': '建筑服务业',
    '湖南建投': '建筑服务业'
}

def organize_files():
    if not os.path.exists(SOURCE_DIR):
        print(f"Error: Source directory {SOURCE_DIR} does not exist.")
        return

    if not os.path.exists(TARGET_DIR):
        os.makedirs(TARGET_DIR)
        print(f"Created target directory: {TARGET_DIR}")

    files = [f for f in os.listdir(SOURCE_DIR) if f.endswith('.xls')]
    
    print(f"Found {len(files)} files to process.")

    # Regex to parse filename
    # Pattern: Client-PROD(Detail)Module-Date.xls
    # Example: 东威科技-PROD(东威科技)工序验收体系-20260130.xls
    pattern = re.compile(r'^(.*?)-PROD\((.*?)\)(.*?)-(\d{8,})\.xls$')

    processed_count = 0
    skipped_count = 0

    for filename in files:
        match = pattern.match(filename)
        if match:
            client_name = match.group(1)
            # detail = match.group(2) # Not used for structure
            module_name = match.group(3)
            # date = match.group(4) # Not used for structure

            # Determine Industry
            industry = INDUSTRY_MAP.get(client_name, '其他行业')
            
            # Construct new path: Industry / Module / Client
            # Using Client Name as folder to group multiple dates if any
            new_path = os.path.join(TARGET_DIR, industry, module_name, client_name)
            
            if not os.path.exists(new_path):
                os.makedirs(new_path)
            
            source_file = os.path.join(SOURCE_DIR, filename)
            target_file = os.path.join(new_path, filename)
            
            try:
                shutil.copy2(source_file, target_file) # Using copy to be safe, can change to move
                # shutil.move(source_file, target_file) 
                print(f"Processed: {filename} -> {industry}/{module_name}/{client_name}/")
                processed_count += 1
            except Exception as e:
                print(f"Error moving {filename}: {e}")
        else:
            print(f"Skipping (no match): {filename}")
            skipped_count += 1

    print(f"\nDone. Processed: {processed_count}, Skipped: {skipped_count}")

if __name__ == "__main__":
    organize_files()
