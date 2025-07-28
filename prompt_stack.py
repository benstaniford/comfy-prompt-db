import os
import json
from .prompt_db import get_user_db_path, DEFAULT_PROMPTS

class AnyType(str):
  """A special class that is always equal in not equal comparisons. Credit to pythongosssss"""

  def __ne__(self, __value: object) -> bool:
    return False

# Nicked from ggthree's FlexibleOptionalInputType
class FlexibleOptionalInputType(dict):
    def __init__(self, type, data: dict | None = None):
        self.type = type
        self.data = data
        if self.data is not None:
            for k, v in self.data.items():
                self[k] = v

    def __getitem__(self, key):
        if self.data is not None and key in self.data:
            val = self.data[key]
            return val
        return (self.type, )

    def __contains__(self, key):
        return True

any_type = AnyType("*")

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
                "preview_text": ("STRING", {"multiline": True, "default": "Preview of stacked prompts will appear here..."}),
            },
            "optional": FlexibleOptionalInputType(any_type, {
                "prompt_1_category": (categories, {"default": categories[0]}),
                "prompt_1_name": (prompt_names, {"default": prompt_names[0] if prompt_names else ""}),
                "prompt_1_enabled": ("BOOLEAN", {"default": True}),
            }),
            "hidden": {},
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("stacked_prompts",)
    FUNCTION = "stack_prompts"
    CATEGORY = "text"
    
    def stack_prompts(self, separator=", ", preview_text="", **kwargs):
        stacked_prompts = []
        prompts_db = {}
        if os.path.exists(self.prompts_file):
            try:
                with open(self.prompts_file, 'r', encoding='utf-8') as f:
                    prompts_db = json.load(f)
            except (json.JSONDecodeError, Exception) as e:
                pass
        else:
            pass

        # Find all prompt entries by scanning for keys like prompt_N_category
        prompt_indices = set()
        for key in kwargs.keys():
            if key.startswith('prompt_') and key.endswith('_category'):
                try:
                    idx = int(key.split('_')[1])
                    prompt_indices.add(idx)
                except Exception:
                    continue
        for idx in sorted(prompt_indices):
            cat = kwargs.get(f'prompt_{idx}_category', None)
            name = kwargs.get(f'prompt_{idx}_name', None)
            enabled = kwargs.get(f'prompt_{idx}_enabled', True)
            if enabled and cat and name:
                prompt_text = prompts_db.get(cat, {}).get(name, "")
                if prompt_text:
                    stacked_prompts.append(prompt_text)
                else:
                    pass
            else:
                pass
        result = separator.join(stacked_prompts)
        return (result,)
