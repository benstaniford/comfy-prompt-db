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
                # First prompt entry
                "prompt_1_category": (categories, {"default": categories[0]}),
                "prompt_1_name": (prompt_names, {"default": prompt_names[0] if prompt_names else ""}),
                "prompt_1_enabled": ("BOOLEAN", {"default": True}),
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
                break
                
            # Get the values for this prompt entry
            category = kwargs.get(category_key, "")
            prompt_name = kwargs.get(name_key, "")
            enabled = kwargs.get(enabled_key, True)
            
            # If enabled and both category and name are provided, get the prompt text
            if enabled and category and prompt_name:
                prompt_text = prompts_db.get(category, {}).get(prompt_name, "")
                if prompt_text:
                    stacked_prompts.append(prompt_text)
            
            prompt_num += 1
        
        # Join all prompts with the separator
        result = separator.join(stacked_prompts)
        return (result,)
