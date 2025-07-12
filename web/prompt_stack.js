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
                
                // Helper to log to the Python pylog endpoint
                const log = async (msg) => {
                    try {
                        await fetch("/pylog", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ msg })
                        });
                    } catch (e) {
                        console.warn("Failed to log to /pylog:", e);
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
                    
                    if (categoryWidget && promptWidget) {
                        const originalCallback = categoryWidget.callback;
                        categoryWidget.callback = function(value) {
                            if (originalCallback) {
                                originalCallback.call(this, value);
                            }
                            updatePromptDropdown(categoryWidget, promptWidget);
                        };
                        
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

                    const firstCategoryWidget = this.widgets.find(w => w.name === "prompt_1_category");
                    const categories = firstCategoryWidget ? firstCategoryWidget.options.values : [];
                    let selectedCategory = init.category || (firstCategoryWidget ? firstCategoryWidget.value : categories[0]);
                    
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
                
                // Let ComfyUI handle widget serialization
                this.serialize_widgets = true;

                // Override onConfigure to handle widget restoration after loading
                const originalOnConfigure = this.onConfigure;
                this.onConfigure = async function(info) {
                    // Let ComfyUI handle the initial restoration of widget values
                    if (originalOnConfigure) {
                        originalOnConfigure.apply(this, arguments);
                    }

                    const values = info?.widgets_values || [];
                    const promptEntryCount = Math.floor((values.length - 1) / 3);

                    // Clean up any extra widgets that might have been added by default
                    while (this.widgets.filter(w => w.name && w.name.startsWith("prompt_") && w.name.endsWith("_enabled")).length > promptEntryCount) {
                        const lastEntryNum = this.widgets.filter(w => w.name && w.name.startsWith("prompt_") && w.name.endsWith("_enabled")).length;
                        const widgetsToRemove = this.widgets.filter(w =>
                             (w.name && (w.name.startsWith(`prompt_${lastEntryNum}_`) || w.name === `❌ Remove Entry ${lastEntryNum}`))
                        );
                         widgetsToRemove.forEach(widget => {
                            this.widgets.splice(this.widgets.indexOf(widget), 1);
                        });
                    }

                    // Add any missing prompt entries sequentially
                    const currentEntries = this.widgets.filter(w => w.name && w.name.startsWith("prompt_") && w.name.endsWith("_enabled")).length;
                    for (let i = currentEntries; i < promptEntryCount; i++) {
                        const entryNum = i + 1;
                        const idx = 1 + i * 3;
                        const initData = {
                            enabled: values[idx],
                            category: values[idx + 1],
                            name: values[idx + 2]
                        };
                        await addPromptEntry.call(this, initData, entryNum);
                    }

                    // Final pass to ensure all dropdowns are correctly populated
                    setTimeout(async () => {
                        const categoryWidgets = this.widgets.filter(w => w.name && w.name.startsWith("prompt_") && w.name.endsWith("_category"));
                        for (const widget of categoryWidgets) {
                            const entryNum = widget.name.split('_')[1];
                            const promptWidget = this.widgets.find(w => w.name === `prompt_${entryNum}_name`);
                            if (promptWidget) {
                                await updatePromptDropdown(widget, promptWidget, promptWidget.value);
                            }
                        }
                    }, 200);
                };

                // Override to serialize all prompt entries
                this.onSerialize = function() {
                    // Default serialization for separator
                    const values = [];
                    for (const widget of this.widgets) {
                        // Only serialize widgets that are not remove buttons
                        if (widget.type === 'button' && widget.label && widget.label.startsWith('❌ Remove Entry')) continue;
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
