import os
import json
from .prompt_db import get_user_db_path, DEFAULT_PROMPTS


class PromptStack:
    """A node that allows stacking multiple prompts from the database into a single output"""
    
    def __init__(self):
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
        # Load categories and prompts from the database
        categories = []
        prompt_names = []
        
        try:
            user_db_path = get_user_db_path()
            prompts_file = os.path.join(user_db_path, "prompts.json")
            
            if not os.path.exists(prompts_file):
                try:
                    os.makedirs(os.path.dirname(prompts_file), exist_ok=True)
                    with open(prompts_file, 'w', encoding='utf-8') as f:
                        json.dump(DEFAULT_PROMPTS, f, indent=2, ensure_ascii=False)
                except Exception as e:
                    print(f"Error creating prompts.json: {e}")
            
            if os.path.exists(prompts_file):
                with open(prompts_file, 'r', encoding='utf-8') as f:
                    prompts_db = json.load(f)
                    categories = list(prompts_db.keys())
                    
                    # Collect all possible prompt names from all categories
                    all_prompt_names = set()
                    for category_prompts in prompts_db.values():
                        if isinstance(category_prompts, dict):
                            all_prompt_names.update(category_prompts.keys())
                    
                    prompt_names = sorted(list(all_prompt_names))
                        
        except Exception as e:
            print(f"Error loading categories for PromptStack INPUT_TYPES: {e}")
        
        # Ensure we have at least one category
        if not categories:
            categories = ["default"]
            prompt_names = ["new prompt"]
        
        return {
            "required": {
                "separator": ("STRING", {"default": ", ", "multiline": False}),
            },
            "optional": {
                # Pre-declare multiple prompt entries so ComfyUI recognizes them
                "prompt_1_category": (categories, {"default": categories[0]}),
                "prompt_1_name": (prompt_names, {"default": prompt_names[0] if prompt_names else ""}),
                "prompt_1_enabled": ("BOOLEAN", {"default": True}),
                "prompt_2_category": (categories, {"default": categories[0]}),
                "prompt_2_name": (prompt_names, {"default": prompt_names[0] if prompt_names else ""}),
                "prompt_2_enabled": ("BOOLEAN", {"default": False}),
                "prompt_3_category": (categories, {"default": categories[0]}),
                "prompt_3_name": (prompt_names, {"default": prompt_names[0] if prompt_names else ""}),
                "prompt_3_enabled": ("BOOLEAN", {"default": False}),
                "prompt_4_category": (categories, {"default": categories[0]}),
                "prompt_4_name": (prompt_names, {"default": prompt_names[0] if prompt_names else ""}),
                "prompt_4_enabled": ("BOOLEAN", {"default": False}),
                "prompt_5_category": (categories, {"default": categories[0]}),
                "prompt_5_name": (prompt_names, {"default": prompt_names[0] if prompt_names else ""}),
                "prompt_5_enabled": ("BOOLEAN", {"default": False}),
                "prompt_6_category": (categories, {"default": categories[0]}),
                "prompt_6_name": (prompt_names, {"default": prompt_names[0] if prompt_names else ""}),
                "prompt_6_enabled": ("BOOLEAN", {"default": False}),
                "prompt_7_category": (categories, {"default": categories[0]}),
                "prompt_7_name": (prompt_names, {"default": prompt_names[0] if prompt_names else ""}),
                "prompt_7_enabled": ("BOOLEAN", {"default": False}),
                "prompt_8_category": (categories, {"default": categories[0]}),
                "prompt_8_name": (prompt_names, {"default": prompt_names[0] if prompt_names else ""}),
                "prompt_8_enabled": ("BOOLEAN", {"default": False}),
                "prompt_9_category": (categories, {"default": categories[0]}),
                "prompt_9_name": (prompt_names, {"default": prompt_names[0] if prompt_names else ""}),
                "prompt_9_enabled": ("BOOLEAN", {"default": False}),
                "prompt_10_category": (categories, {"default": categories[0]}),
                "prompt_10_name": (prompt_names, {"default": prompt_names[0] if prompt_names else ""}),
                "prompt_10_enabled": ("BOOLEAN", {"default": False}),
            },
            "hidden": {},
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("stacked_prompts",)
    FUNCTION = "stack_prompts"
    CATEGORY = "text"
    
    def stack_prompts(self, separator=", ", **kwargs):
        """Stack multiple prompts from the database into a single string"""
        stacked_prompts = []
        
        # Debug: Print all kwargs to understand what's being passed
        print(f"PromptStack kwargs: {kwargs}")
        
        # Load the prompts database
        prompts_db = {}
        if os.path.exists(self.prompts_file):
            try:
                with open(self.prompts_file, 'r', encoding='utf-8') as f:
                    prompts_db = json.load(f)
            except (json.JSONDecodeError, Exception) as e:
                print(f"Error loading prompts.json in PromptStack: {e}")
        
        # Process prompt entries in order
        prompt_num = 1
        while True:
            category_key = f"prompt_{prompt_num}_category"
            name_key = f"prompt_{prompt_num}_name"
            enabled_key = f"prompt_{prompt_num}_enabled"
            
            # Check if this prompt entry exists in kwargs
            if category_key not in kwargs or name_key not in kwargs:
                print(f"Breaking at prompt {prompt_num}: {category_key} or {name_key} not found in kwargs")
                break
                
            # Get the values for this prompt entry
            category = kwargs.get(category_key, "")
            prompt_name = kwargs.get(name_key, "")
            enabled = kwargs.get(enabled_key, True)
            
            print(f"Processing prompt {prompt_num}: category={category}, name={prompt_name}, enabled={enabled}")
            
            # If enabled and both category and name are provided, get the prompt text
            if enabled and category and prompt_name:
                prompt_text = prompts_db.get(category, {}).get(prompt_name, "")
                print(f"Found prompt text: {prompt_text[:50]}..." if len(prompt_text) > 50 else f"Found prompt text: {prompt_text}")
                if prompt_text:
                    stacked_prompts.append(prompt_text)
            
            prompt_num += 1
        
        # Join all prompts with the separator
        result = separator.join(stacked_prompts)
        print(f"Final stacked result: {result}")
        return (result,)
