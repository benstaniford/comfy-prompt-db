# Prompt Database for ComfyUI

A ComfyUI custom node that provides a database-driven prompt management system. Store, organize, and edit prompts in categories with persistent JSON storage.

## Features

- **Category-based Organization**: Organize prompts into logical categories
- **Dropdown Selection**: Easy category and prompt selection via dropdown menus
- **Editable Prompts**: Edit prompt text directly in the node interface
- **Persistent Storage**: All prompts stored in `user/default/user-db/prompts.json` in your ComfyUI directory
- **Save/Load Functionality**: Save changes back to the database instantly
- **Create New Prompts**: Add new categories and prompts on the fly
- **No Inputs Required**: Standalone text generation node

## Installation

### Method 1: ComfyUI Manager (Recommended)
1. Install via ComfyUI Manager using this Git URL:
   ```
   https://github.com/yourusername/comfy-prompt-db
   ```

### Method 2: Manual Installation
1. Clone into your ComfyUI custom_nodes folder:
   ```bash
   cd ComfyUI/custom_nodes
   git clone https://github.com/yourusername/comfy-prompt-db.git
   ```
2. Restart ComfyUI

## Usage

1. Add the "Prompt Database" node from the "text" category
2. Select a category from the first dropdown menu
3. Select a prompt name from the second dropdown menu
4. The prompt text will automatically load in the text area
5. Edit the prompt text if desired
6. Click "💾 Save" to save changes back to the database
7. Click "📝 New" to create a new category/prompt combination
8. Connect the output to other nodes that accept text input

## Node Details

**Inputs:**
- None - this is a standalone text generation node

**Outputs:**
- `prompt_text`: The selected/edited prompt text as a string

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

Use the "📝 New" button to create new categories and prompts. The system will:
1. Prompt you for a category name
2. Prompt you for a prompt name
3. Create the new entry in the database
4. Automatically select the new entry for editing

## License

This project is licensed under the same license as specified in the LICENSE file.
