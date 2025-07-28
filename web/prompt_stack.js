import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// Extension for Prompt Stack
app.registerExtension({
    name: "PromptStack",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        
        if (nodeData.name === "PromptStack") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                // Function to load categories
                const loadCategories = async () => {
                    try {
                        const response = await api.fetchApi("/prompt_db_categories", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({})
                        });
                        
                        if (response.ok) {
                            const data = await response.json();
                            return data.categories || [];
                        }
                    } catch (error) {
                        console.error("Error loading categories:", error);
                    }
                    return [];
                };

                // Function to load prompts for a category
                const loadPrompts = async (category) => {
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
                            return data.prompts || [];
                        }
                    } catch (error) {
                        console.error("Error loading prompts:", error);
                    }
                    return [];
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
                            return data.prompt_text || "";
                        }
                    } catch (error) {
                        console.error("Error loading prompt text:", error);
                    }
                    return "";
                };
                
                // Function to build and update preview
                const updatePreview = async () => {
                    const previewWidget = this.widgets.find(w => w.name === 'preview_text');
                    const separatorWidget = this.widgets.find(w => w.name === 'separator');
                    
                    if (!previewWidget || !separatorWidget) return;
                    
                    const separator = separatorWidget.value || ", ";
                    const stacked_prompts = [];
                    
                    // Find all prompt entries by scanning for enabled widgets
                    const enabledWidgets = this.widgets.filter(w => w.name && w.name.startsWith('prompt_') && w.name.endsWith('_enabled'));
                    
                    for (const enabledWidget of enabledWidgets) {
                        const entryNum = enabledWidget.name.split('_')[1];
                        const categoryWidget = this.widgets.find(w => w.name === `prompt_${entryNum}_category`);
                        const promptWidget = this.widgets.find(w => w.name === `prompt_${entryNum}_name`);
                        
                        if (enabledWidget.value && categoryWidget && promptWidget && categoryWidget.value && promptWidget.value) {
                            try {
                                const promptText = await loadPromptText(categoryWidget.value, promptWidget.value);
                                if (promptText) {
                                    stacked_prompts.push(promptText);
                                }
                            } catch (error) {
                                console.error("Error loading prompt text for preview:", error);
                            }
                        }
                    }
                    
                    const result = stacked_prompts.join(separator);
                    previewWidget.value = result;
                    
                    // Update the DOM element if it exists
                    if (previewWidget.inputEl) {
                        previewWidget.inputEl.value = result;
                    }
                };
                
                // Function to update category dropdown
                const updateCategoryDropdown = async (categoryWidget, restoredCategoryName = null) => {
                    const categories = await loadCategories();
                    categoryWidget.options.values = categories;

                    // If a specific category was restored, ensure it's set, otherwise pick the first
                    if (restoredCategoryName && categories.includes(restoredCategoryName)) {
                        categoryWidget.value = restoredCategoryName;
                    } else {
                        categoryWidget.value = categories.length > 0 ? categories[0] : "";
                    }
                    
                    // Update the DOM element if it exists
                    if (categoryWidget.inputEl) {
                        categoryWidget.inputEl.innerHTML = "";
                        categories.forEach(category => {
                            const option = document.createElement("option");
                            option.value = category;
                            option.textContent = category;
                            if (category === categoryWidget.value) {
                                option.selected = true;
                            }
                            categoryWidget.inputEl.appendChild(option);
                        });
                    }
                };

                // Function to update prompt dropdown when category changes
                const updatePromptDropdown = async (categoryWidget, promptWidget, restoredPromptName = null) => {
                    if (categoryWidget.value) {
                        const prompts = await loadPrompts(categoryWidget.value);
                        promptWidget.options.values = prompts;

                        // If a specific prompt was restored, ensure it's set, otherwise pick the first
                        if (restoredPromptName && prompts.includes(restoredPromptName)) {
                            promptWidget.value = restoredPromptName;
                        } else {
                            promptWidget.value = prompts.length > 0 ? prompts[0] : "";
                        }
                        
                        // Update the DOM element if it exists
                        if (promptWidget.inputEl) {
                            promptWidget.inputEl.innerHTML = "";
                            prompts.forEach(prompt => {
                                const option = document.createElement("option");
                                option.value = prompt;
                                option.textContent = prompt;
                                if (prompt === promptWidget.value) {
                                    option.selected = true;
                                }
                                promptWidget.inputEl.appendChild(option);
                            });
                        }
                    }
                };
                
                // Set up category change handlers for existing widgets
                const setupCategoryHandler = (entryNum) => {
                    const categoryWidget = this.widgets.find(w => w.name === `prompt_${entryNum}_category`);
                    const promptWidget = this.widgets.find(w => w.name === `prompt_${entryNum}_name`);
                    const enabledWidget = this.widgets.find(w => w.name === `prompt_${entryNum}_enabled`);
                    
                    if (categoryWidget && promptWidget) {
                        const originalCategoryCallback = categoryWidget.callback;
                        categoryWidget.callback = function(value) {
                            if (originalCategoryCallback) {
                                originalCategoryCallback.call(this, value);
                            }
                            updatePromptDropdown(categoryWidget, promptWidget);
                        };
                        
                        const originalPromptCallback = promptWidget.callback;
                        promptWidget.callback = function(value) {
                            if (originalPromptCallback) {
                                originalPromptCallback.call(this, value);
                            }
                            // Auto-update preview when prompt selection changes
                            setTimeout(() => updatePreview(), 100);
                        };
                        
                        // Add enabled widget callback if it exists
                        if (enabledWidget) {
                            const originalEnabledCallback = enabledWidget.callback;
                            enabledWidget.callback = function(value) {
                                if (originalEnabledCallback) {
                                    originalEnabledCallback.call(this, value);
                                }
                                // Auto-update preview when enabled state changes
                                setTimeout(() => updatePreview(), 100);
                            };
                        }
                        
                        // Load initial prompts
                        if (categoryWidget.value) {
                            updatePromptDropdown(categoryWidget, promptWidget);
                        }
                    }
                };
                
                // Set up the first entry
                setupCategoryHandler(1);
                
                // Function to add a new prompt entry (now supports initial values and entry number for restore)
                const addPromptEntry = async (init = {}, entryNum = -1) => {
                    if (entryNum === -1) {
                        entryNum = this.widgets.filter(w => w.name && w.name.startsWith("prompt_") && w.name.endsWith("_enabled")).length + 1;
                    }

                    // Load categories from API instead of copying from first widget
                    const categories = await loadCategories();
                    let selectedCategory = init.category || (categories.length > 0 ? categories[0] : "");
                    
                    let prompts = [];
                    if (selectedCategory) {
                        prompts = await loadPrompts(selectedCategory);
                    }
                    
                    let selectedPrompt = init.name || (prompts.length > 0 ? prompts[0] : "");
                    
                    const enabledWidget = this.addWidget("toggle", `prompt_${entryNum}_enabled`, init.enabled !== undefined ? init.enabled : true, null);
                    const categoryWidget = this.addWidget("combo", `prompt_${entryNum}_category`, selectedCategory, null, { values: [...categories] });
                    const promptWidget = this.addWidget("combo", `prompt_${entryNum}_name`, selectedPrompt, null, { values: [...prompts] });
                    
                    setupCategoryHandler(entryNum);
                    
                    this.addWidget("button", `❌ Remove Entry ${entryNum}`, "", () => {
                        const widgetsToRemove = this.widgets.filter(w =>
                            (w.name && (w.name.startsWith(`prompt_${entryNum}_`) || w.name === `❌ Remove Entry ${entryNum}`))
                        );
                        widgetsToRemove.forEach(widget => {
                            this.widgets.splice(this.widgets.indexOf(widget), 1);
                        });
                        this.computeSize();
                        this.setDirtyCanvas(true, true);
                    });

                    // Manually set the value for the restored prompt name, as the initial list might not contain it
                    if (init.name) {
                        promptWidget.value = init.name;
                    }

                    updatePromptDropdown(categoryWidget, promptWidget, init.name);
                    this.computeSize();
                    this.setDirtyCanvas(true, true);
                };
                
                // Add the "Add Prompt" button
                const addButton = this.addWidget("button", "➕ Add Prompt Entry", "", () => { addPromptEntry.call(this); });
                
                // Function to create preview widgets
                const createPreviewWidgets = () => {
                    // Find the preview_text widget that ComfyUI created from the Python backend
                    const previewWidget = this.widgets.find(w => w.name === 'preview_text');
                    if (previewWidget) {
                        // Make sure it's read-only and styled properly
                        if (previewWidget.inputEl) {
                            previewWidget.inputEl.readOnly = true;
                            previewWidget.inputEl.style.backgroundColor = "#f5f5f5";
                            previewWidget.inputEl.placeholder = "Preview of stacked prompts will appear here...";
                        }
                        
                        // Set up separator widget callback to auto-update preview
                        const separatorWidget = this.widgets.find(w => w.name === 'separator');
                        if (separatorWidget) {
                            const originalSeparatorCallback = separatorWidget.callback;
                            separatorWidget.callback = function(value) {
                                if (originalSeparatorCallback) {
                                    originalSeparatorCallback.call(this, value);
                                }
                                // Auto-update preview when separator changes
                                setTimeout(() => updatePreview(), 100);
                            };
                        }
                        
                        this.computeSize();
                        this.setDirtyCanvas(true, true);
                    }
                };
                
                // Wait for ComfyUI to add the separator widget, then add preview widgets after it
                setTimeout(() => {
                    createPreviewWidgets();
                }, 50);
                
                // Let ComfyUI handle widget serialization
                this.serialize_widgets = true;

                // Override onConfigure to handle widget restoration after loading
                const originalOnConfigure = this.onConfigure;
                this.onConfigure = async function(info) {
                    console.log('[PromptStack] onConfigure called', info);
                    // Remove all prompt widgets except separator and add button
                    const widgetsToRemove = this.widgets.filter(w => w.name && w.name.startsWith('prompt_'));
                    console.log('[PromptStack] Removing prompt widgets:', widgetsToRemove.map(w => w.name));
                    widgetsToRemove.forEach(widget => {
                        this.widgets.splice(this.widgets.indexOf(widget), 1);
                    });
                    // Remove all remove buttons
                    const removeButtons = this.widgets.filter(w => w.type === 'button' && w.label && w.label.startsWith('❌ Remove Entry'));
                    console.log('[PromptStack] Removing remove buttons:', removeButtons.map(w => w.label));
                    removeButtons.forEach(widget => {
                        this.widgets.splice(this.widgets.indexOf(widget), 1);
                    });

                    // Let ComfyUI restore static widgets (like separator)
                    if (originalOnConfigure) {
                        console.log('[PromptStack] Calling originalOnConfigure');
                        originalOnConfigure.apply(this, arguments);
                    }

                    // Re-setup preview widgets after restoration
                    setTimeout(() => {
                        createPreviewWidgets();
                    }, 50);

                    // Parse prompt entries from widgets_values (category, name, [skip text], enabled)
                    const values = info?.widgets_values || [];
                    console.log('[PromptStack] widgets_values:', values);
                    let promptEntries = [];
                    for (let i = 1; i + 3 < values.length; i += 4) {
                        promptEntries.push({
                            enabled: values[i + 1],
                            category: values[i + 2],
                            name: values[i + 3]
                        });
                    }
                    console.log('[PromptStack] Parsed promptEntries:', promptEntries);
                    // Add prompt widgets for each entry
                    for (let i = 0; i < promptEntries.length; i++) {
                        console.log(`[PromptStack] Adding prompt entry #${i+1}:`, promptEntries[i]);
                        await addPromptEntry.call(this, promptEntries[i], i + 1);
                    }

                    // Log all widgets after restore
                    console.log('[PromptStack] Widgets after restore:', this.widgets.map(w => w.name || w.label || w.type));

                    //Final pass to ensure all dropdowns are correctly populated
                    setTimeout(async () => {
                        const categoryWidgets = this.widgets.filter(w => w.name && w.name.startsWith("prompt_") && w.name.endsWith("_category"));
                        for (const widget of categoryWidgets) {
                            const entryNum = widget.name.split('_')[1];
                            const promptWidget = this.widgets.find(w => w.name === `prompt_${entryNum}_name`);
                            if (promptWidget) {
                                console.log(`[PromptStack] Updating dropdowns for entry #${entryNum}:`, widget.value, promptWidget.value);
                                // Update category dropdown first
                                await updateCategoryDropdown(widget, widget.value);
                                // Then update prompt dropdown
                                await updatePromptDropdown(widget, promptWidget, promptWidget.value);
                            }
                        }
                        
                        // Update preview after all dropdowns are populated
                        setTimeout(() => updatePreview(), 300);
                    }, 200);
                };

                // Override to serialize all prompt entries
                this.onSerialize = function() {
                    // Default serialization for separator
                    const values = [];
                    for (const widget of this.widgets) {
                        // Only serialize widgets that are not remove buttons, preview widgets, or separators
                        if (widget.type === 'button' && widget.label && widget.label.startsWith('❌ Remove Entry')) continue;
                        if (widget.name === 'preview_text') continue; // Don't serialize preview text
                        if (widget.type === 'text' && widget.label && widget.label.startsWith('────────────────')) continue;
                        if (widget.type === 'text' && widget.label && widget.label === 'Stacked Prompts:') continue;
                        if (typeof widget.serializeValue === 'function') {
                            values.push(widget.serializeValue(this, values.length));
                        } else if (widget.value !== undefined) {
                            values.push(widget.value);
                        }
                    }
                    return values;
                };

                // Override to map widgets to backend parameter names
                this.onGetInputs = function() {
                    const inputs = {};
                    let promptNum = 1;
                    for (const widget of this.widgets) {
                        if (widget.name === `prompt_${promptNum}_category`) {
                            inputs[`prompt_${promptNum}_category`] = widget.value;
                        } else if (widget.name === `prompt_${promptNum}_name`) {
                            inputs[`prompt_${promptNum}_name`] = widget.value;
                        } else if (widget.name === `prompt_${promptNum}_enabled`) {
                            inputs[`prompt_${promptNum}_enabled`] = widget.value;
                            promptNum++;
                        }
                    }
                    // Also add separator
                    const sepWidget = this.widgets.find(w => w.name === 'separator');
                    if (sepWidget) {
                        inputs['separator'] = sepWidget.value;
                    }
                    return inputs;
                };

                // Force the node to resize
                this.computeSize();
                this.setDirtyCanvas(true, true);
                
                return r;
            };
        }
    }
});
