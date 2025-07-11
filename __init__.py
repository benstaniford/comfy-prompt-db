from .prompt_db import PromptDB
from .prompt_stack import PromptStack

NODE_CLASS_MAPPINGS = {
    "PromptDB": PromptDB,
    "PromptStack": PromptStack
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptDB": "Prompt Database",
    "PromptStack": "Prompt Stack"
}

# Web directory for ComfyUI to serve JavaScript files
WEB_DIRECTORY = "./web"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
