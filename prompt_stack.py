import os
import json
from .prompt_db import get_user_db_path, DEFAULT_PROMPTS
from .pylog import log

class AnyType(str):
  """A special class that is always equal in not equal comparisons. Credit to pythongosssss"""

  def __ne__(self, __value: object) -> bool:
    return False

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
            },
            "optional": {
                # First prompt entry
                "prompt_1_category": (categories, {"default": categories[0]}),
                "prompt_1_name": (prompt_names, {"default": prompt_names[0] if prompt_names else ""}),
                "prompt_1_enabled": ("BOOLEAN", {"default": True}),
            },
            #"optional": FlexibleOptionalInputType(any_type, {
            #    "prompt_category": (categories, {"default": categories[0]}),
            #    "prompt_name": (prompt_names, {"default": prompt_names[0] if prompt_names else ""}),
            #    "prompt_enabled": ("BOOLEAN", {"default": True}),
            #}),
            "hidden": {},
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("stacked_prompts",)
    FUNCTION = "stack_prompts"
    CATEGORY = "text"
    
    def stack_prompts(self, separator=", ", **kwargs):
        """Stack multiple prompts from the database into a single string"""
        log(f"[PromptStack] stack_prompts called with separator='{separator}' and kwargs={kwargs}")
        stacked_prompts = []
        
        # Load the prompts database
        prompts_db = {}
        if os.path.exists(self.prompts_file):
            try:
                with open(self.prompts_file, 'r', encoding='utf-8') as f:
                    prompts_db = json.load(f)
                log(f"[PromptStack] Loaded prompts_db with categories: {list(prompts_db.keys())}")
            except (json.JSONDecodeError, Exception) as e:
                log(f"[PromptStack] Error loading prompts.json: {e}")
        else:
            log(f"[PromptStack] prompts_file does not exist: {self.prompts_file}")
        
        # Process prompt entries in order
        prompt_num = 1
        while True:
            category_key = f"prompt_{prompt_num}_category"
            name_key = f"prompt_{prompt_num}_name"
            enabled_key = f"prompt_{prompt_num}_enabled"
            log(f"[PromptStack] Checking keys: {category_key}, {name_key}, {enabled_key}")
            
            # Check if this prompt entry exists in kwargs
            if category_key not in kwargs or name_key not in kwargs:
                log(f"[PromptStack] Key(s) missing in kwargs. Breaking loop at prompt_num={prompt_num}")
                break
                
            # Get the values for this prompt entry
            category = kwargs.get(category_key, "")
            prompt_name = kwargs.get(name_key, "")
            enabled = kwargs.get(enabled_key, True)
            log(f"[PromptStack] Entry {prompt_num}: category='{category}', prompt_name='{prompt_name}', enabled={enabled}")
            
            # If enabled and both category and name are provided, get the prompt text
            if enabled and category and prompt_name:
                prompt_text = prompts_db.get(category, {}).get(prompt_name, "")
                log(f"[PromptStack] prompt_text for category='{category}', prompt_name='{prompt_name}': '{prompt_text}'")
                if prompt_text:
                    stacked_prompts.append(prompt_text)
                    log(f"[PromptStack] Added prompt_text to stacked_prompts.")
                else:
                    log(f"[PromptStack] No prompt_text found for category='{category}', prompt_name='{prompt_name}'")
            else:
                log(f"[PromptStack] Entry {prompt_num} skipped (enabled={enabled}, category='{category}', prompt_name='{prompt_name}')")
            
            prompt_num += 1
        
        # Join all prompts with the separator
        result = separator.join(stacked_prompts)
        log(f"[PromptStack] Final stacked result: '{result}'")
        return (result,)
