import os
import json
import folder_paths
from aiohttp import web
import server

# DRY: Define default prompts once at module level
DEFAULT_PROMPTS = {
    "poses": {
        "posing with camera": "a person posing with a camera, professional photography pose, confident stance",
        "casual sitting": "person sitting casually, relaxed posture, natural lighting",
        "standing portrait": "person standing in portrait pose, direct eye contact, professional setting"
    },
    "styles": {
        "cinematic": "cinematic lighting, dramatic shadows, film grain, professional cinematography",
        "artistic": "artistic composition, creative lighting, expressive style, fine art photography",
        "minimalist": "clean composition, minimal background, simple elegant style"
    },
    "quality": {
        "high quality": "masterpiece, best quality, ultra detailed, 8k resolution, professional photography",
        "artistic quality": "artistic masterpiece, fine art, museum quality, exceptional detail",
        "photorealistic": "photorealistic, hyperrealistic, lifelike, professional photo quality"
    }
}

def get_comfy_path():
    """Get the ComfyUI root directory with fallback methods"""
    try:
        # Method 1: Use folder_paths.base_path if available
        if hasattr(folder_paths, 'base_path'):
            return folder_paths.base_path
        
        # Method 2: Use checkpoints folder path
        checkpoint_paths = folder_paths.get_folder_paths("checkpoints")
        if checkpoint_paths:
            # Go up from models/checkpoints to the root
            checkpoint_path = checkpoint_paths[0]
            if "models" in checkpoint_path:
                return checkpoint_path.split("models")[0].rstrip(os.sep)
        
        # Method 3: Use output folder path
        output_paths = folder_paths.get_folder_paths("output")
        if output_paths:
            # Go up from output to the root
            output_path = output_paths[0]
            if "output" in output_path:
                return output_path.split("output")[0].rstrip(os.sep)
        
        # Method 4: Use current working directory as fallback
        return os.getcwd()
    except Exception as e:
        # If we can't determine the path, try to find the ComfyUI directory by going up
        current_dir = os.path.dirname(os.path.abspath(__file__))
        while current_dir != os.path.dirname(current_dir):  # Stop at root
            if os.path.exists(os.path.join(current_dir, "main.py")) and os.path.exists(os.path.join(current_dir, "comfy")):
                return current_dir
            current_dir = os.path.dirname(current_dir)
        return os.getcwd()


def get_user_db_path():
    """Get the user database directory"""
    try:
        comfy_path = get_comfy_path()
        user_db_path = os.path.join(comfy_path, "user", "default", "user-db")
        os.makedirs(user_db_path, exist_ok=True)
        return user_db_path
    except Exception as e:
        print(f"Error creating user database directory: {e}")
        return get_comfy_path()  # fallback to root


class PromptDB:
    def __init__(self):
        # Get the user database directory
        self.user_db_path = get_user_db_path()
        self.prompts_file = os.path.join(self.user_db_path, "prompts.json")
        self.ensure_prompts_file()
    
    def ensure_prompts_file(self):
        """Create prompts.json file if it doesn't exist"""
        if not os.path.exists(self.prompts_file):
            try:
                os.makedirs(os.path.dirname(self.prompts_file), exist_ok=True)
                with open(self.prompts_file, 'w', encoding='utf-8') as f:
                    json.dump(DEFAULT_PROMPTS, f, indent=2, ensure_ascii=False)
            except Exception as e:
                print(f"Error creating prompts.json: {e}")

    @classmethod
    def INPUT_TYPES(cls):
        # Load categories from the prompts file
        categories = []
        prompt_names = []
        
        try:
            # Get the user database directory
            user_db_path = get_user_db_path()
            prompts_file = os.path.join(user_db_path, "prompts.json")
            
            # Create file if it doesn't exist
            if not os.path.exists(prompts_file):
                try:
                    os.makedirs(os.path.dirname(prompts_file), exist_ok=True)
                    with open(prompts_file, 'w', encoding='utf-8') as f:
                        json.dump(DEFAULT_PROMPTS, f, indent=2, ensure_ascii=False)
                except Exception as e:
                    print(f"Error creating prompts.json: {e}")
            
            # Load the prompts file
            if os.path.exists(prompts_file):
                with open(prompts_file, 'r', encoding='utf-8') as f:
                    prompts_db = json.load(f)
                    categories = list(prompts_db.keys())
                    
                    # Collect all possible prompt names from all categories
                    all_prompt_names = set()
                    for category_prompts in prompts_db.values():
                        if isinstance(category_prompts, dict):
                            all_prompt_names.update(category_prompts.keys())
                    
                    # Convert to list and ensure consistent ordering
                    prompt_names = sorted(list(all_prompt_names))
                    
                    # Use the first category's first prompt as default
                    if categories and prompt_names:
                        first_category = categories[0]
                        first_category_prompts = list(prompts_db[first_category].keys())
                        if first_category_prompts:
                            # Put the first prompt from the first category at the beginning
                            default_prompt = first_category_prompts[0]
                            if default_prompt in prompt_names:
                                prompt_names.remove(default_prompt)
                                prompt_names.insert(0, default_prompt)
                        
        except Exception as e:
            print(f"Error loading categories for INPUT_TYPES: {e}")
        
        # Ensure we have at least one category
        if not categories:
            categories = ["default"]
            prompt_names = ["new prompt"]
        
        # Ensure the default prompt is from the first category
        default_prompt = ""
        if categories and len(categories) > 0:
            try:
                # Re-read the file to get the first category's first prompt
                if os.path.exists(prompts_file):
                    with open(prompts_file, 'r', encoding='utf-8') as f:
                        prompts_db = json.load(f)
                        first_category = categories[0]
                        first_category_prompts = list(prompts_db.get(first_category, {}).keys())
                        if first_category_prompts:
                            default_prompt = first_category_prompts[0]
            except Exception as e:
                pass
        
        if not default_prompt and prompt_names:
            default_prompt = prompt_names[0]
        
        return {
            "required": {
                "category": (categories, {"default": categories[0]}),
                "prompt_name": (prompt_names, {"default": default_prompt}),
                "prompt_text": ("STRING", {"multiline": True, "default": ""}),
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("prompt_text",)
    FUNCTION = "get_prompt"
    CATEGORY = "text"
    
    def get_prompt(self, category="", prompt_name="", prompt_text=""):
        """Return the prompt text"""
        return (prompt_text,)


# API endpoint for loading categories
@server.PromptServer.instance.routes.post("/prompt_db_categories")
async def load_categories(request):
    try:
        # Get the user database directory
        user_db_path = get_user_db_path()
        prompts_file = os.path.join(user_db_path, "prompts.json")
        
        # Load prompts database
        prompts_db = {}
        if os.path.exists(prompts_file):
            try:
                with open(prompts_file, 'r', encoding='utf-8') as f:
                    prompts_db = json.load(f)
            except (json.JSONDecodeError, Exception) as e:
                print(f"Error loading prompts.json: {e}")
        
        categories = list(prompts_db.keys()) if prompts_db else []
        
        return web.json_response({"categories": categories})
        
    except Exception as e:
        print(f"Error in load_categories: {e}")
        return web.json_response({"categories": []}, status=500)


# API endpoint for loading prompts in a category
@server.PromptServer.instance.routes.post("/prompt_db_prompts")
async def load_prompts(request):
    try:
        data = await request.json()
        category = data.get("category", "")
        
        if not category:
            return web.json_response({"prompts": []})
        
        # Get the user database directory
        user_db_path = get_user_db_path()
        prompts_file = os.path.join(user_db_path, "prompts.json")
        
        # Load prompts database
        prompts_db = {}
        if os.path.exists(prompts_file):
            try:
                with open(prompts_file, 'r', encoding='utf-8') as f:
                    prompts_db = json.load(f)
            except (json.JSONDecodeError, Exception) as e:
                print(f"Error loading prompts.json: {e}")
        
        category_prompts = prompts_db.get(category, {})
        prompt_names = list(category_prompts.keys()) if category_prompts else []
        
        return web.json_response({"prompts": prompt_names})
        
    except Exception as e:
        print(f"Error in load_prompts: {e}")
        return web.json_response({"prompts": []}, status=500)


# API endpoint for loading prompt text
@server.PromptServer.instance.routes.post("/prompt_db_text")
async def load_prompt_text(request):
    try:
        data = await request.json()
        category = data.get("category", "")
        prompt_name = data.get("prompt_name", "")
        
        if not category or not prompt_name:
            return web.json_response({"prompt_text": ""})
        
        # Get the user database directory
        user_db_path = get_user_db_path()
        prompts_file = os.path.join(user_db_path, "prompts.json")
        
        # Load prompts database
        prompts_db = {}
        if os.path.exists(prompts_file):
            try:
                with open(prompts_file, 'r', encoding='utf-8') as f:
                    prompts_db = json.load(f)
            except (json.JSONDecodeError, Exception) as e:
                print(f"Error loading prompts.json: {e}")
        
        prompt_text = prompts_db.get(category, {}).get(prompt_name, "")
        
        return web.json_response({"prompt_text": prompt_text})
        
    except Exception as e:
        print(f"Error in load_prompt_text: {e}")
        return web.json_response({"prompt_text": ""}, status=500)


# API endpoint for saving prompt text
@server.PromptServer.instance.routes.post("/prompt_db_save")
async def save_prompt_text(request):
    try:
        data = await request.json()
        category = data.get("category", "")
        prompt_name = data.get("prompt_name", "")
        prompt_text = data.get("prompt_text", "")
        
        if not category or not prompt_name:
            return web.json_response({"success": False, "message": "Category and prompt name are required"})
        
        # Get the user database directory
        user_db_path = get_user_db_path()
        prompts_file = os.path.join(user_db_path, "prompts.json")
        
        # Load existing prompts database
        prompts_db = {}
        if os.path.exists(prompts_file):
            try:
                with open(prompts_file, 'r', encoding='utf-8') as f:
                    prompts_db = json.load(f)
            except (json.JSONDecodeError, Exception) as e:
                print(f"Error loading prompts.json: {e}")
        
        # Ensure category exists
        if category not in prompts_db:
            prompts_db[category] = {}
        
        # Save the prompt text
        prompts_db[category][prompt_name] = prompt_text
        
        # Save to file
        try:
            os.makedirs(os.path.dirname(prompts_file), exist_ok=True)
            with open(prompts_file, 'w', encoding='utf-8') as f:
                json.dump(prompts_db, f, indent=2, ensure_ascii=False)
            
            return web.json_response({"success": True, "message": f"Saved prompt '{prompt_name}'"})
            
        except Exception as e:
            print(f"Error saving prompts.json: {e}")
            return web.json_response({"success": False, "message": f"Error saving: {e}"})
        
    except Exception as e:
        print(f"Error in save_prompt_text: {e}")
        return web.json_response({"success": False, "message": f"Error: {e}"}, status=500)


# API endpoint for creating new category/prompt
@server.PromptServer.instance.routes.post("/prompt_db_create")
async def create_new_prompt(request):
    try:
        data = await request.json()
        category = data.get("category", "")
        prompt_name = data.get("prompt_name", "")
        
        if not category or not prompt_name:
            return web.json_response({"success": False, "message": "Category and prompt name are required"})
        
        # Get the user database directory
        user_db_path = get_user_db_path()
        prompts_file = os.path.join(user_db_path, "prompts.json")
        
        # Load existing prompts database
        prompts_db = {}
        if os.path.exists(prompts_file):
            try:
                with open(prompts_file, 'r', encoding='utf-8') as f:
                    prompts_db = json.load(f)
            except (json.JSONDecodeError, Exception) as e:
                print(f"Error loading prompts.json: {e}")
        
        # Ensure category exists (create if new, use existing if already exists)
        is_new_category = category not in prompts_db
        if category not in prompts_db:
            prompts_db[category] = {}
        
        # Create new prompt with empty text
        prompts_db[category][prompt_name] = ""
        
        # Save to file
        try:
            os.makedirs(os.path.dirname(prompts_file), exist_ok=True)
            with open(prompts_file, 'w', encoding='utf-8') as f:
                json.dump(prompts_db, f, indent=2, ensure_ascii=False)
            
            if is_new_category:
                message = f"Created new category '{category}' and added prompt '{prompt_name}'"
            else:
                message = f"Added prompt '{prompt_name}' to existing category '{category}'"
            
            return web.json_response({"success": True, "message": message})
            
        except Exception as e:
            print(f"Error saving prompts.json: {e}")
            return web.json_response({"success": False, "message": f"Error saving: {e}"})
        
    except Exception as e:
        print(f"Error in create_new_prompt: {e}")
        return web.json_response({"success": False, "message": f"Error: {e}"}, status=500)
