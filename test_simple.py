import os
import json

# Test the core functionality without ComfyUI dependencies
def test_core_functionality():
    # Simulate the get_comfy_path function logic
    def get_comfy_path():
        # Find ComfyUI by going up from the current directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        while current_dir != os.path.dirname(current_dir):
            if os.path.exists(os.path.join(current_dir, "main.py")) and os.path.exists(os.path.join(current_dir, "comfy")):
                return current_dir
            current_dir = os.path.dirname(current_dir)
        return os.getcwd()
    
    # Test the path finding
    comfy_path = get_comfy_path()
    print(f"ComfyUI path: {comfy_path}")
    
    # Check if prompts.json exists
    prompts_file = os.path.join(comfy_path, "prompts.json")
    print(f"Prompts file: {prompts_file}")
    print(f"File exists: {os.path.exists(prompts_file)}")
    
    # Test loading categories
    if os.path.exists(prompts_file):
        with open(prompts_file, 'r', encoding='utf-8') as f:
            prompts_db = json.load(f)
            categories = list(prompts_db.keys())
            print(f"Categories: {categories}")
            
            if categories:
                first_category = categories[0]
                prompt_names = list(prompts_db[first_category].keys())
                print(f"Prompt names in '{first_category}': {prompt_names}")
                print(f"Default category: {categories[0]}")
                print(f"Default prompt name: {prompt_names[0] if prompt_names else ''}")
                
                # This is what INPUT_TYPES should return
                print(f"INPUT_TYPES category tuple: ({categories}, {{'default': '{categories[0]}'}})")
                print(f"INPUT_TYPES prompt_name tuple: ({prompt_names}, {{'default': '{prompt_names[0] if prompt_names else ''}'}})")
    else:
        print("No prompts.json found - would create default")

if __name__ == "__main__":
    test_core_functionality()
