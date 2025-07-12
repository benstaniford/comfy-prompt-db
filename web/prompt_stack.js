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
                const updatePromptDropdown = async (categoryWidget, promptWidget) => {
                    if (categoryWidget.value) {
                        const prompts = await loadPrompts(categoryWidget.value);
                        promptWidget.options.values = prompts;
                        promptWidget.value = prompts.length > 0 ? prompts[0] : "";
                        
                        // Update the DOM element if it exists
                        if (promptWidget.inputEl) {
                            promptWidget.inputEl.innerHTML = "";
                            prompts.forEach(prompt => {
                                const option = document.createElement("option");
                                option.value = prompt;
                                option.textContent = prompt;
                                promptWidget.inputEl.appendChild(option);
                            });
                            promptWidget.inputEl.value = promptWidget.value;
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
                
                // Function to add a new prompt entry (now supports initial values for restore)
                const addPromptEntry = async (init = {}) => {
                    const entryNum = this.widgets.filter(w => w.name && w.name.startsWith("prompt_") && w.name.endsWith("_enabled")).length + 1;
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
                    const removeButton = this.addWidget("button", `❌ Remove Entry ${entryNum}`, "", () => {
                        const widgetsToRemove = this.widgets.filter(w =>
                            w.name === `prompt_${entryNum}_enabled` ||
                            w.name === `prompt_${entryNum}_category` ||
                            w.name === `prompt_${entryNum}_name` ||
                            w.name === `❌ Remove Entry ${entryNum}`
                        );
                        widgetsToRemove.forEach(widget => {
                            const index = this.widgets.indexOf(widget);
                            if (index > -1) {
                                this.widgets.splice(index, 1);
                            }
                        });
                        this.computeSize();
                        this.setDirtyCanvas(true, true);
                    });
                    updatePromptDropdown(categoryWidget, promptWidget);
                    this.computeSize();
                    this.setDirtyCanvas(true, true);
                };
                
                // Add the "Add Prompt" button
                const addButton = this.addWidget("button", "➕ Add Prompt Entry", "", () => { addPromptEntry(); });
                
                // Let ComfyUI handle widget serialization
                this.serialize_widgets = true;

                // Override onConfigure to handle widget restoration after loading
                const originalOnConfigure = this.onConfigure;
                this.onConfigure = function(info) {
                    const values = info?.widgets_values || [];
                    const promptEntryCount = Math.floor((values.length - 1) / 3);
                    // Remove all but the first prompt entry (if any)
                    while (this.widgets.filter(w => w.name && w.name.startsWith("prompt_") && w.name.endsWith("_enabled")).length > 1) {
                        const entryNum = this.widgets.filter(w => w.name && w.name.startsWith("prompt_") && w.name.endsWith("_enabled")).length;
                        const widgetsToRemove = this.widgets.filter(w =>
                            w.name === `prompt_${entryNum}_enabled` ||
                            w.name === `prompt_${entryNum}_category` ||
                            w.name === `prompt_${entryNum}_name` ||
                            w.name === `❌ Remove Entry ${entryNum}`
                        );
                        widgetsToRemove.forEach(widget => {
                            const index = this.widgets.indexOf(widget);
                            if (index > -1) {
                                this.widgets.splice(index, 1);
                            }
                        });
                    }
                    // Add prompt entries with correct values (skip the first, which already exists)
                    for (let i = 1; i < promptEntryCount; i++) {
                        const idx = 1 + i * 3;
                        addPromptEntry.call(this, {
                            enabled: values[idx],
                            category: values[idx + 1],
                            name: values[idx + 2]
                        });
                    }
                    if (originalOnConfigure) {
                        originalOnConfigure.call(this, info);
                    }
                    setTimeout(async () => {
                        const categoryWidgets = this.widgets.filter(w => w.name && w.name.startsWith("prompt_") && w.name.endsWith("_category"));
                        for (const categoryWidget of categoryWidgets) {
                            const entryNum = categoryWidget.name.split('_')[1];
                            const promptWidget = this.widgets.find(w => w.name === `prompt_${entryNum}_name`);
                            if (promptWidget && categoryWidget.value) {
                                const prompts = await loadPrompts(categoryWidget.value);
                                promptWidget.options.values = prompts;
                                if (!prompts.includes(promptWidget.value)) {
                                    promptWidget.value = prompts.length > 0 ? prompts[0] : "";
                                }
                                if (promptWidget.inputEl) {
                                    promptWidget.inputEl.innerHTML = "";
                                    prompts.forEach(prompt => {
                                        const option = document.createElement("option");
                                        option.value = prompt;
                                        option.textContent = prompt;
                                        promptWidget.inputEl.appendChild(option);
                                    });
                                    promptWidget.inputEl.value = promptWidget.value;
                                }
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
