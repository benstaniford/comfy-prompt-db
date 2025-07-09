import os
import json
import folder_paths
from aiohttp import web
import server


def get_comfy_path():
    """Get the ComfyUI root directory with fallback methods"""
    try:
        # Method 1: Use checkpoints folder path
        checkpoint_paths = folder_paths.get_folder_paths("checkpoints")
        if checkpoint_paths:
            # Go up from models/checkpoints to the root
            checkpoint_path = checkpoint_paths[0]
            if "models" in checkpoint_path:
                return checkpoint_path.split("models")[0].rstrip(os.sep)
        
        # Method 2: Use output folder path
        output_paths = folder_paths.get_folder_paths("output")
        if output_paths:
            # Go up from output to the root
            output_path = output_paths[0]
            if "output" in output_path:
                return output_path.split("output")[0].rstrip(os.sep)
        
        # Method 3: Use current working directory as fallback
        return os.getcwd()
    except Exception as e:
        print(f"Error determining ComfyUI path: {e}")
        # If we can't determine the path, try to find the ComfyUI directory by going up
        current_dir = os.path.dirname(os.path.abspath(__file__))
        while current_dir != os.path.dirname(current_dir):  # Stop at root
            if os.path.exists(os.path.join(current_dir, "main.py")) and os.path.exists(os.path.join(current_dir, "comfy")):
                return current_dir
            current_dir = os.path.dirname(current_dir)
        return os.getcwd()


class PromptDB:
    def __init__(self):
        # Get the ComfyUI root directory
        self.comfy_path = get_comfy_path()
        self.prompts_file = os.path.join(self.comfy_path, "prompts.json")
        self.ensure_prompts_file()
    
    def ensure_prompts_file(self):
        """Create prompts.json file if it doesn't exist"""
        if not os.path.exists(self.prompts_file):
            default_prompts = {
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
            try:
                os.makedirs(os.path.dirname(self.prompts_file), exist_ok=True)
                with open(self.prompts_file, 'w', encoding='utf-8') as f:
                    json.dump(default_prompts, f, indent=2, ensure_ascii=False)
                print(f"Created default prompts.json at {self.prompts_file}")
            except Exception as e:
                print(f"Error creating prompts.json: {e}")

    @classmethod
    def INPUT_TYPES(cls):
        # Load categories from the prompts file
        categories = []
        prompt_names = []
        
        try:
            # Get the ComfyUI root directory
            comfy_path = get_comfy_path()
            prompts_file = os.path.join(comfy_path, "prompts.json")
            
            # Create file if it doesn't exist
            if not os.path.exists(prompts_file):
                default_prompts = {
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
                try:
                    os.makedirs(os.path.dirname(prompts_file), exist_ok=True)
                    with open(prompts_file, 'w', encoding='utf-8') as f:
                        json.dump(default_prompts, f, indent=2, ensure_ascii=False)
                    print(f"Created default prompts.json at {prompts_file}")
                except Exception as e:
                    print(f"Error creating prompts.json: {e}")
            
            # Load the prompts file
            if os.path.exists(prompts_file):
                with open(prompts_file, 'r', encoding='utf-8') as f:
                    prompts_db = json.load(f)
                    categories = list(prompts_db.keys())
                    # Load prompt names for the first category
                    if categories:
                        first_category = categories[0]
                        prompt_names = list(prompts_db[first_category].keys())
                        
        except Exception as e:
            print(f"Error loading categories for INPUT_TYPES: {e}")
        
        # Ensure we have at least one category
        if not categories:
            categories = ["default"]
            prompt_names = ["new prompt"]
        
        return {
            "required": {
                "category": (categories, {"default": categories[0]}),
                "prompt_name": (prompt_names, {"default": prompt_names[0] if prompt_names else ""}),
                "prompt_text": ("STRING", {"multiline": True, "default": ""}),
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("prompt_text",)
    FUNCTION = "get_prompt"
    CATEGORY = "text"
    
    # Add this to help with debugging
    @classmethod
    def IS_CHANGED(cls):
        return float("nan")  # Always re-execute
    
    def load_prompts_db(self):
        """Load the prompts database from JSON file"""
        if os.path.exists(self.prompts_file):
            try:
                with open(self.prompts_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, Exception) as e:
                print(f"Error loading prompts.json: {e}")
                return {}
        return {}
    
    def save_prompts_db(self, prompts_db):
        """Save the prompts database to JSON file"""
        try:
            os.makedirs(os.path.dirname(self.prompts_file), exist_ok=True)
            with open(self.prompts_file, 'w', encoding='utf-8') as f:
                json.dump(prompts_db, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving prompts.json: {e}")
    
    def get_prompt(self, category="", prompt_name="", prompt_text=""):
        """Return the prompt text"""
        return (prompt_text,)


# API endpoint for loading categories
@server.PromptServer.instance.routes.post("/prompt_db_categories")
async def load_categories(request):
    try:
        # Get the ComfyUI root directory
        comfy_path = get_comfy_path()
        prompts_file = os.path.join(comfy_path, "prompts.json")
        
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
        
        # Get the ComfyUI root directory
        comfy_path = get_comfy_path()
        prompts_file = os.path.join(comfy_path, "prompts.json")
        
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
        
        # Get the ComfyUI root directory
        comfy_path = get_comfy_path()
        prompts_file = os.path.join(comfy_path, "prompts.json")
        
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
        
        # Get the ComfyUI root directory
        comfy_path = get_comfy_path()
        prompts_file = os.path.join(comfy_path, "prompts.json")
        
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
            
            print(f"Saved prompt '{prompt_name}' in category '{category}'")
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
        
        # Get the ComfyUI root directory
        comfy_path = get_comfy_path()
        prompts_file = os.path.join(comfy_path, "prompts.json")
        
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
        
        # Create new prompt with empty text
        prompts_db[category][prompt_name] = ""
        
        # Save to file
        try:
            os.makedirs(os.path.dirname(prompts_file), exist_ok=True)
            with open(prompts_file, 'w', encoding='utf-8') as f:
                json.dump(prompts_db, f, indent=2, ensure_ascii=False)
            
            print(f"Created new prompt '{prompt_name}' in category '{category}'")
            return web.json_response({"success": True, "message": f"Created new prompt '{prompt_name}'"})
            
        except Exception as e:
            print(f"Error saving prompts.json: {e}")
            return web.json_response({"success": False, "message": f"Error saving: {e}"})
        
    except Exception as e:
        print(f"Error in create_new_prompt: {e}")
        return web.json_response({"success": False, "message": f"Error: {e}"}, status=500)


NODE_CLASS_MAPPINGS = {
    "PromptDB": PromptDB
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptDB": "Prompt Database"
}
