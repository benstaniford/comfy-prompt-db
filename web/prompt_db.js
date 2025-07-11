import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// Extension for Prompt DB
app.registerExtension({
    name: "PromptDB",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        
        if (nodeData.name === "PromptDB") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                // Find the input widgets
                const categoryWidget = this.widgets?.find(w => w.name === "category");
                const promptNameWidget = this.widgets?.find(w => w.name === "prompt_name");
                const promptTextWidget = this.widgets?.find(w => w.name === "prompt_text");
                
                if (categoryWidget && promptNameWidget && promptTextWidget) {
                    
                    // Function to load prompts for a category
                    const loadPrompts = async (category, preserveCurrentSelection = false, desiredPromptName = null) => {
                        try {
                            const response = await api.fetchApi("/prompt_db_prompts", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    category: category
                                })
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                
                                // Update the prompt name dropdown values
                                if (data.prompts && data.prompts.length > 0) {
                                    promptNameWidget.options.values = data.prompts;
                                    
                                    // Use desiredPromptName if provided, otherwise preserve current selection
                                    let targetPrompt = desiredPromptName ?? promptNameWidget.value;
                                    if (!data.prompts.includes(targetPrompt)) {
                                        targetPrompt = data.prompts[0];
                                    }
                                    promptNameWidget.value = targetPrompt;
                                    
                                    // If widget has an input element, update it
                                    if (promptNameWidget.inputEl) {
                                        promptNameWidget.inputEl.innerHTML = "";
                                        data.prompts.forEach(prompt => {
                                            const option = document.createElement("option");
                                            option.value = prompt;
                                            option.textContent = prompt;
                                            promptNameWidget.inputEl.appendChild(option);
                                        });
                                        promptNameWidget.inputEl.value = promptNameWidget.value;
                                    }
                                    
                                    // Load text for the current prompt (not necessarily the first one)
                                    await loadPromptText(category, promptNameWidget.value);
                                } else {
                                    promptNameWidget.options.values = [];
                                    promptNameWidget.value = "";
                                    promptTextWidget.value = "";
                                }
                            }
                        } catch (error) {
                            console.error("Error loading prompts:", error);
                        }
                    };
                    
                    // Function to load prompt text
                    const loadPromptText = async (category, promptName) => {
                        try {
                            const response = await api.fetchApi("/prompt_db_text", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    category: category,
                                    prompt_name: promptName
                                })
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                
                                promptTextWidget.value = data.prompt_text || "";
                                
                                // Update the text area DOM element if it exists
                                if (promptTextWidget.inputEl) {
                                    promptTextWidget.inputEl.value = data.prompt_text || "";
                                }
                                
                                // Trigger the callback to update the node
                                if (promptTextWidget.callback) {
                                    promptTextWidget.callback(data.prompt_text || "");
                                }
                                
                                // Force canvas redraw to show changes
                                nodeInstance.setDirtyCanvas(true, true);
                            }
                        } catch (error) {
                            console.error("Error loading prompt text:", error);
                        }
                    };
                    
                    // Store original callbacks
                    const originalCategoryCallback = categoryWidget.callback;
                    const originalPromptNameCallback = promptNameWidget.callback;
                    
                    // Store reference to the node instance
                    const nodeInstance = this;
                    
                    // Override category widget callback
                    categoryWidget.callback = function(value) {
                        if (originalCategoryCallback) {
                            originalCategoryCallback.call(this, value);
                        }
                        if (value) {
                            loadPrompts(value);
                        }
                    };
                    
                    // Override prompt name widget callback
                    promptNameWidget.callback = function(value) {
                        if (originalPromptNameCallback) {
                            originalPromptNameCallback.call(this, value);
                        }
                        if (value && categoryWidget.value) {
                            loadPromptText(categoryWidget.value, value);
                        }
                    };
                    
                    // Add Save button
                    const saveButton = this.addWidget("button", "💾 Save", "", async () => {
                        const category = categoryWidget.value;
                        const promptName = promptNameWidget.value;
                        const promptText = promptTextWidget.value;
                        
                        if (!category || !promptName) {
                            alert("Category and prompt name are required");
                            return;
                        }
                        
                        try {
                            const response = await api.fetchApi("/prompt_db_save", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    category: category,
                                    prompt_name: promptName,
                                    prompt_text: promptText
                                })
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                if (data.success) {
                                    // Success - could show a brief success message if needed
                                } else {
                                    alert("Save failed: " + data.message);
                                }
                            } else {
                                alert("API call failed with status: " + response.status);
                            }
                        } catch (error) {
                            alert("Error during save: " + error.message);
                        }
                    });
                    
                    // Add input fields for new prompt creation
                    const newCategoryWidget = this.addWidget("text", "New/Existing Category", "", null);
                    // Add helpful placeholder if the input element supports it
                    if (newCategoryWidget.inputEl) {
                        newCategoryWidget.inputEl.placeholder = "Enter category name...";
                        newCategoryWidget.inputEl.title = "Enter a new category name to create it, or an existing category name to add a prompt to it";
                    }
                    
                    const newPromptNameWidget = this.addWidget("text", "New Prompt Name", "", null);
                    if (newPromptNameWidget.inputEl) {
                        newPromptNameWidget.inputEl.placeholder = "Enter prompt name...";
                        newPromptNameWidget.inputEl.title = "Enter a unique name for your new prompt";
                    }
                    
                    // Add New button
                    const newButton = this.addWidget("button", "📝 Add Prompt", "", async () => {
                        
                        const category = newCategoryWidget.value?.trim();
                        const promptName = newPromptNameWidget.value?.trim();
                        
                        if (!category) {
                            alert("Please enter a category name (new or existing)");
                            return;
                        }
                        
                        if (!promptName) {
                            alert("Please enter a prompt name");
                            return;
                        }
                        
                        try {
                            const response = await api.fetchApi("/prompt_db_create", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    category: category,
                                    prompt_name: promptName
                                })
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                if (data.success) {
                                    
                                    // Update category dropdown if it's a new category
                                    const currentCategories = categoryWidget.options.values;
                                    if (!currentCategories.includes(category)) {
                                        categoryWidget.options.values.push(category);
                                        if (categoryWidget.inputEl) {
                                            const option = document.createElement("option");
                                            option.value = category;
                                            option.textContent = category;
                                            categoryWidget.inputEl.appendChild(option);
                                        }
                                    }
                                    
                                    // Select the new category and load its prompts
                                    categoryWidget.value = category;
                                    if (categoryWidget.inputEl) {
                                        categoryWidget.inputEl.value = category;
                                    }
                                    
                                    await loadPrompts(category);
                                    
                                    // Select the new prompt
                                    promptNameWidget.value = promptName;
                                    if (promptNameWidget.inputEl) {
                                        promptNameWidget.inputEl.value = promptName;
                                    }
                                    
                                    // Clear text area for new prompt
                                    promptTextWidget.value = "";
                                    if (promptTextWidget.callback) {
                                        promptTextWidget.callback("");
                                    }
                                    
                                    // Clear the input fields
                                    newCategoryWidget.value = "";
                                    newPromptNameWidget.value = "";
                                    if (newCategoryWidget.inputEl) {
                                        newCategoryWidget.inputEl.value = "";
                                    }
                                    if (newPromptNameWidget.inputEl) {
                                        newPromptNameWidget.inputEl.value = "";
                                    }
                                } else {
                                    alert("Create failed: " + data.message);
                                }
                            } else {
                                alert("API call failed with status: " + response.status);
                            }
                        } catch (error) {
                            alert("Error creating prompt: " + error.message);
                        }
                    });
                    
                    // Initialize with current category
                    if (categoryWidget.value) {
                        // Load prompts for the current category, preserving current selection
                        loadPrompts(categoryWidget.value, true).then(() => {
                            // After loading prompts, load the text for the current prompt
                            if (promptNameWidget.value) {
                                loadPromptText(categoryWidget.value, promptNameWidget.value);
                            }
                        });
                    }
                    
                    // Let ComfyUI handle widget serialization naturally
                    this.serialize_widgets = true;
                    
                    // Override onConfigure to handle prompt text loading after widget restoration
                    const originalOnConfigure = this.onConfigure;
                    this.onConfigure = function(info) {
                        // Let ComfyUI restore the widget values first
                        if (originalOnConfigure) {
                            originalOnConfigure.call(this, info);
                        }
                        
                        // After widgets are restored, load the prompts and text
                        setTimeout(() => {
                            const categoryWidget = this.widgets?.find(w => w.name === "category");
                            const promptNameWidget = this.widgets?.find(w => w.name === "prompt_name");
                            const promptTextWidget = this.widgets?.find(w => w.name === "prompt_text");
                            
                            // Use the restored value from widgets_values (index 1 for prompt_name)
                            const restoredPromptName = info?.widgets_values?.[1];
                            if (categoryWidget && categoryWidget.value) {
                                // Load prompts for this category, and try to restore the prompt_name
                                loadPrompts(categoryWidget.value, true, restoredPromptName);
                            }
                        }, 200);
                    };
                    
                    // Force the node to resize to show the new buttons
                    this.computeSize();
                    this.setDirtyCanvas(true, true);
                } else {
                    // Could not find required widgets
                }
                
                return r;
            };
        }
    }
});
