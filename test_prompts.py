import os
import json

# Test the get_comfy_path function and prompts.json creation
def test_prompts_db():
    # Simulate the comfy path as the current directory
    comfy_path = os.getcwd()
    prompts_file = os.path.join(comfy_path, "prompts.json")
    
    print(f"Looking for prompts.json at: {prompts_file}")
    print(f"File exists: {os.path.exists(prompts_file)}")
    
    if os.path.exists(prompts_file):
        try:
            with open(prompts_file, 'r', encoding='utf-8') as f:
                prompts_db = json.load(f)
                categories = list(prompts_db.keys())
                print(f"Categories found: {categories}")
                
                if categories:
                    first_category = categories[0]
                    prompt_names = list(prompts_db[first_category].keys())
                    print(f"Prompt names in '{first_category}': {prompt_names}")
                    
                    if prompt_names:
                        first_prompt = prompt_names[0]
                        prompt_text = prompts_db[first_category][first_prompt]
                        print(f"Text for '{first_prompt}': {prompt_text}")
                        
        except Exception as e:
            print(f"Error reading prompts.json: {e}")
    else:
        print("prompts.json not found")

if __name__ == "__main__":
    test_prompts_db()
