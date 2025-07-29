# Prompt Database for ComfyUI

A ComfyUI custom node package that provides database-driven prompt management. Store, organize, and edit prompts in categories with persistent JSON storage.

## Screenshot

<img width="1048" height="927" alt="image" src="https://github.com/user-attachments/assets/2a7cd75b-024e-47c7-99a3-be0944e8c3ab" />

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

The **Prompt Stack** node allows you to combine multiple prompts from different categories into a single output string. This is useful for building complex prompt chains or modular prompt templates.

#### Features
- **Multiple Prompt Entries**: Add as many prompt entries as you need, each with its own category and prompt selection.
- **Dynamic Dropdowns**: Category and prompt dropdowns are dynamically populated from your prompt database. If you add new categories or prompts, they will appear automatically.
- **Enable/Disable Entries**: Each prompt entry can be enabled or disabled individually.
- **Custom Separator**: Choose how prompts are joined (default is `, `).
- **Easy Add/Remove**: Use the ➕ button to add new entries and ❌ to remove them.
- **Automatic Restoration**: When loading a saved workflow, all prompt entries and their selections are restored, and dropdowns are updated to reflect the current database.

#### How to Use
1. Add the **Prompt Stack** node from the "text" category in ComfyUI.
2. For each prompt entry:
   - Toggle the enabled checkbox to include/exclude the prompt.
   - Select a category from the dropdown (populated from your database).
   - Select a prompt name from the dropdown (updates automatically when category changes).
3. Use the **➕ Add Prompt Entry** button to add more prompts to the stack.
4. Use the **❌ Remove Entry X** button to remove individual entries (except the first one).
5. Set the separator string (default is `, `) to control how prompts are joined.
6. The output will be all enabled prompts concatenated with the separator.
7. Connect the output to other nodes that accept text input.

#### Example Output
If you have three enabled prompt entries with prompts:
- "masterpiece, best quality"
- "cinematic lighting, dramatic shadows"
- "person standing in portrait pose"

And your separator is `, `, the output will be:

```
masterpiece, best quality, cinematic lighting, dramatic shadows, person standing in portrait pose
```

#### Technical Details
- **Dropdowns**: Both category and prompt dropdowns are kept in sync with the database. When the node is loaded or categories/prompts change, dropdowns update automatically.
- **Persistence**: All prompt selections and enabled states are saved with the workflow and restored on load.
- **No Inputs Required**: The node is standalone and does not require any input connections.

See the [Database Structure](#database-structure) section for details on how prompts are stored.

## Node Details

### Prompt Database Node
**Inputs:** None - this is a standalone text generation node  
**Outputs:** `prompt_text`: The selected/edited prompt text as a string

### Prompt Stack Node
**Inputs:** None - this is a standalone text generation node  
**Outputs:** `stacked_prompts`: All enabled prompts concatenated with the separator as a string

## Database Structure

Prompts are stored in `user/default/user-db/prompts.json` in your ComfyUI directory:

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

To create new categories or prompts, simply type a new category or prompt name in the text fields and click "💾 Save". The system will automatically create or update the entry in the database and select it for editing.  Alternately, you can edit the raw json file.  Most LLMs are excellent at adding whole sections of JSON to this file given a good prompt.

## License

This project is licensed under the same license as specified in the LICENSE file.
