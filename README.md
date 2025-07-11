# Prompt Database for ComfyUI

A ComfyUI custom node package that provides database-driven prompt management. Store, organize, and edit prompts in categories with persistent JSON storage.

## Features

- **Two Node Types**: 
  - **Prompt Database**: Single prompt editor with category/prompt selection
  - **Prompt Stack**: Stack multiple prompts from different categories into one output
- **Category-based Organization**: Organize prompts into logical categories
- **Dropdown Selection**: Easy category and prompt selection via dropdown menus
- **Editable Prompts**: Edit prompt text directly in the Prompt Database node
- **Persistent Storage**: All prompts stored in `user/default/user-db/prompts.json` in your ComfyUI directory
- **Save/Load Functionality**: Save changes back to the database instantly
- **Create or Update Prompts**: Add new categories and prompts, or update existing ones
- **No Inputs Required**: Both nodes are standalone text generation nodes

## Installation

### Method 1: ComfyUI Manager (Recommended)
1. Install via ComfyUI Manager using this Git URL:
   ```
   https://github.com/benstaniford/comfy-prompt-db.git
   ```

### Method 2: Manual Installation
1. Clone into your ComfyUI custom_nodes folder:
   ```bash
   cd ComfyUI/custom_nodes
   git clone https://github.com/benstaniford/comfy-prompt-db.git
   ```
2. Restart ComfyUI

## Nodes

### Prompt Database Node

1. Add the "Prompt Database" node from the "text" category
2. Select a category from the first dropdown menu
3. Select a prompt name from the second dropdown menu
4. The prompt text will automatically load in the text area
5. Edit the prompt text if desired
6. To add a new category or prompt, simply type a new category or prompt name in the text fields below the dropdowns
7. Click "💾 Save" to create a new category or prompt, or to update an existing one
8. Connect the output to other nodes that accept text input

#### How to Add or Update Prompts and Categories
- **To add a new category:** Enter a new category name in the "Add/Update Category" text field, enter a prompt name, and click "💾 Save". The new category and prompt will be created.
- **To add a new prompt to an existing category:** Select the category from the dropdown, enter a new prompt name in the "Add/Update Prompt Name" text field, and click "💾 Save".
- **To update an existing prompt:** Select the category and prompt from the dropdowns, edit the prompt text, and click "💾 Save".
- The text fields below the dropdowns always reflect the current selection, but you can overwrite them to create new entries.

### Prompt Stack Node

1. Add the "Prompt Stack" node from the "text" category
2. For each prompt entry:
   - Toggle the enabled checkbox to include/exclude the prompt
   - Select a category from the dropdown
   - Select a prompt name from the dropdown (updates automatically when category changes)
3. Use the "➕ Add Prompt Entry" button to add more prompts to the stack
4. Use the "❌ Remove Entry X" button to remove individual entries (except the first one)
5. Set the separator string (default is ", ") to control how prompts are joined
6. The output will be all enabled prompts concatenated with the separator
7. Connect the output to other nodes that accept text input

## Node Details

### Prompt Database Node
**Inputs:** None - this is a standalone text generation node  
**Outputs:** `prompt_text`: The selected/edited prompt text as a string

### Prompt Stack Node
**Inputs:** None - this is a standalone text generation node  
**Outputs:** `stacked_prompts`: All enabled prompts concatenated with the separator as a string

## Database Structure

Prompts are stored in `prompts.json` in your ComfyUI root directory:

```json
{
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
```

## Default Categories

The node comes with sample categories and prompts:
- **poses**: Various posing descriptions
- **styles**: Different artistic and photographic styles  
- **quality**: Quality and detail descriptors

## Creating New Content

To create new categories or prompts, simply type a new category or prompt name in the text fields and click "💾 Save". The system will automatically create or update the entry in the database and select it for editing.

## License

This project is licensed under the same license as specified in the LICENSE file.
