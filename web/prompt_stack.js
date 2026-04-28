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

                // Flag to track if we're in a restore scenario
                this._isRestoring = false;

                // Initialize entries storage
                this._promptEntries = [];

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

                    if (previewWidget.inputEl) {
                        previewWidget.inputEl.value = result;
                    }
                };

                const updateCategoryDropdown = async (categoryWidget, restoredCategoryName = null) => {
                    const categories = await loadCategories();
                    categoryWidget.options.values = categories;

                    if (restoredCategoryName && categories.includes(restoredCategoryName)) {
                        categoryWidget.value = restoredCategoryName;
                    } else {
                        categoryWidget.value = categories.length > 0 ? categories[0] : "";
                    }

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

                const updatePromptDropdown = async (categoryWidget, promptWidget, restoredPromptName = null) => {
                    if (categoryWidget.value) {
                        const prompts = await loadPrompts(categoryWidget.value);
                        promptWidget.options.values = prompts;

                        if (restoredPromptName && prompts.includes(restoredPromptName)) {
                            promptWidget.value = restoredPromptName;
                        } else {
                            promptWidget.value = prompts.length > 0 ? prompts[0] : "";
                        }

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

                // Sync current widget values to _promptEntries
                const syncEntries = () => {
                    const entries = [];
                    const enabledWidgets = this.widgets.filter(w => w.name && w.name.startsWith('prompt_') && w.name.endsWith('_enabled'));
                    for (const enabledWidget of enabledWidgets) {
                        const entryNum = enabledWidget.name.split('_')[1];
                        const categoryWidget = this.widgets.find(w => w.name === `prompt_${entryNum}_category`);
                        const promptWidget = this.widgets.find(w => w.name === `prompt_${entryNum}_name`);
                        if (categoryWidget && promptWidget) {
                            entries.push({
                                category: categoryWidget.value,
                                name: promptWidget.value,
                                enabled: enabledWidget.value
                            });
                        }
                    }
                    this._promptEntries = entries;
                };

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
                            (async () => {
                                await updatePromptDropdown(categoryWidget, promptWidget);
                                syncEntries();
                                await updatePreview();
                            })();
                        };

                        const originalPromptCallback = promptWidget.callback;
                        promptWidget.callback = function(value) {
                            if (originalPromptCallback) {
                                originalPromptCallback.call(this, value);
                            }
                            syncEntries();
                            setTimeout(() => updatePreview(), 100);
                        };

                        if (enabledWidget) {
                            const originalEnabledCallback = enabledWidget.callback;
                            enabledWidget.callback = function(value) {
                                if (originalEnabledCallback) {
                                    originalEnabledCallback.call(this, value);
                                }
                                syncEntries();
                                setTimeout(() => updatePreview(), 100);
                            };
                        }

                        if (categoryWidget.value) {
                            updatePromptDropdown(categoryWidget, promptWidget);
                        }

                        if (entryNum === 1 && !this._isRestoring) {
                            const existingRemoveButton = this.widgets.find(w => w.type === 'button' && w.label === `❌ Remove Entry ${entryNum}`);
                            if (!existingRemoveButton) {
                                this.addWidget("button", `❌ Remove Entry ${entryNum}`, "", () => {
                                    const widgetsToRemove = this.widgets.filter(w =>
                                        (w.name && (w.name.startsWith(`prompt_${entryNum}_`) || w.name === `❌ Remove Entry ${entryNum}`))
                                    );
                                    widgetsToRemove.forEach(widget => {
                                        this.widgets.splice(this.widgets.indexOf(widget), 1);
                                    });
                                    syncEntries();
                                    this.computeSize();
                                    this.setDirtyCanvas(true, true);
                                });
                            }
                        }
                    }
                };

                const refreshAllDropdowns = async () => {
                    console.log('[PromptStack] Refreshing all dropdowns with fresh data');

                    const categoryWidgets = this.widgets.filter(w => w.name && w.name.startsWith("prompt_") && w.name.endsWith("_category"));

                    for (const categoryWidget of categoryWidgets) {
                        const entryNum = categoryWidget.name.split('_')[1];
                        const promptWidget = this.widgets.find(w => w.name === `prompt_${entryNum}_name`);

                        if (promptWidget) {
                            const currentCategory = categoryWidget.value;
                            const currentPrompt = promptWidget.value;

                            await updateCategoryDropdown(categoryWidget, currentCategory);
                            await updatePromptDropdown(categoryWidget, promptWidget, currentPrompt);
                        }
                    }

                    setTimeout(() => updatePreview(), 100);
                };

                const addPromptEntry = async (init = {}, entryNum = -1) => {
                    if (entryNum === -1) {
                        entryNum = this.widgets.filter(w => w.name && w.name.startsWith("prompt_") && w.name.endsWith("_enabled")).length + 1;
                    }

                    const categories = await loadCategories();
                    let selectedCategory = init.category || (categories.length > 0 ? categories[0] : "");

                    let prompts = [];
                    if (selectedCategory) {
                        prompts = await loadPrompts(selectedCategory);
                    }

                    let selectedPrompt = init.name || (prompts.length > 0 ? prompts[0] : "");

                    const categoryWidget = this.addWidget("combo", `prompt_${entryNum}_category`, selectedCategory, null, { values: [...categories] });
                    const promptWidget = this.addWidget("combo", `prompt_${entryNum}_name`, selectedPrompt, null, { values: [...prompts] });
                    const enabledWidget = this.addWidget("toggle", `prompt_${entryNum}_enabled`, init.enabled !== undefined ? init.enabled : true, null);

                    setupCategoryHandler(entryNum);

                    const existingRemoveButton = this.widgets.find(w => w.type === 'button' && w.label === `❌ Remove Entry ${entryNum}`);
                    if (!existingRemoveButton) {
                        this.addWidget("button", `❌ Remove Entry ${entryNum}`, "", () => {
                            const widgetsToRemove = this.widgets.filter(w =>
                                (w.name && (w.name.startsWith(`prompt_${entryNum}_`) || w.name === `❌ Remove Entry ${entryNum}`))
                            );
                            widgetsToRemove.forEach(widget => {
                                this.widgets.splice(this.widgets.indexOf(widget), 1);
                            });
                            syncEntries();
                            this.computeSize();
                            this.setDirtyCanvas(true, true);
                        });
                    }

                    if (init.name) {
                        promptWidget.value = init.name;
                    }

                    await updatePromptDropdown(categoryWidget, promptWidget, init.name);
                    syncEntries();

                    this.computeSize();
                    this.setDirtyCanvas(true, true);
                };

                const createPreviewWidgets = () => {
                    const previewWidget = this.widgets.find(w => w.name === 'preview_text');
                    if (previewWidget) {
                        if (previewWidget.inputEl) {
                            previewWidget.inputEl.readOnly = true;
                            previewWidget.inputEl.placeholder = "Preview of stacked prompts will appear here...";
                        }

                        const separatorWidget = this.widgets.find(w => w.name === 'separator');
                        if (separatorWidget) {
                            const originalSeparatorCallback = separatorWidget.callback;
                            separatorWidget.callback = function(value) {
                                if (originalSeparatorCallback) {
                                    originalSeparatorCallback.call(this, value);
                                }
                                setTimeout(() => updatePreview(), 100);
                            };
                        }

                        this.computeSize();
                        this.setDirtyCanvas(true, true);
                    }
                };

                // Add buttons and initialize first entry (only for new nodes, not restored)
                setTimeout(() => {
                    if (!this._isRestoring) {
                        createPreviewWidgets();

                        const previewIndex = this.widgets.findIndex(w => w.name === 'preview_text');
                        if (previewIndex !== -1) {
                            const reloadButton = this.addWidget("button", "🔄 Reload DB", "", () => {
                                refreshAllDropdowns.call(this);
                            });
                            const reloadIndex = this.widgets.indexOf(reloadButton);
                            if (reloadIndex > previewIndex + 1) {
                                this.widgets.splice(reloadIndex, 1);
                                this.widgets.splice(previewIndex + 1, 0, reloadButton);
                            }

                            const addButton = this.addWidget("button", "➕ Add Prompt Entry", "", () => { addPromptEntry.call(this); });
                            const addIndex = this.widgets.indexOf(addButton);
                            const currentReloadIndex = this.widgets.indexOf(reloadButton);
                            if (addIndex > currentReloadIndex + 1) {
                                this.widgets.splice(addIndex, 1);
                                this.widgets.splice(currentReloadIndex + 1, 0, addButton);
                            }
                        }

                        setupCategoryHandler(1);
                        refreshAllDropdowns();
                        syncEntries();
                    }
                }, 50);

                // --- SERIALIZATION ---
                // Override onSerialize for widgets_values (separator etc.)
                this.onSerialize = function() {
                    const values = [];
                    for (const widget of this.widgets) {
                        if (widget.type === 'button' && widget.label && (widget.label.startsWith('❌ Remove Entry') || widget.label === '➕ Add Prompt Entry' || widget.label === '🔄 Reload DB')) continue;
                        if (widget.name === 'preview_text') continue;
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

                this.serialize_widgets = true;

                // Override serialize() to inject prompt entries directly into node data.
                // This bypasses all ComfyUI/LiteGraph property handling.
                const originalSerialize = this.serialize;
                this.serialize = function() {
                    const data = originalSerialize ? originalSerialize.apply(this, arguments) : {};
                    // Store entries in a custom field on the serialized node data
                    data.promptStack_entries = this._promptEntries || [];
                    return data;
                };

                // Override onConfigure to restore from our custom field
                this.onConfigure = async function(info) {
                    console.log('[PromptStack] onConfigure called', info);

                    this._isRestoring = true;

                    // Remove all prompt widgets and buttons to rebuild cleanly
                    const widgetsToRemove = this.widgets.filter(w => w.name && w.name.startsWith('prompt_'));
                    console.log('[PromptStack] Removing prompt widgets:', widgetsToRemove.map(w => w.name));
                    widgetsToRemove.forEach(widget => {
                        this.widgets.splice(this.widgets.indexOf(widget), 1);
                    });
                    const removeButtons = this.widgets.filter(w => w.type === 'button' && w.label && (w.label.startsWith('❌ Remove Entry') || w.label === '➕ Add Prompt Entry' || w.label === '🔄 Reload DB'));
                    console.log('[PromptStack] Removing remove buttons:', removeButtons.map(w => w.label));
                    removeButtons.forEach(widget => {
                        this.widgets.splice(this.widgets.indexOf(widget), 1);
                    });

                    // Restore entries from custom field in serialized node data
                    let savedEntries = [];
                    if (info?.promptStack_entries && Array.isArray(info.promptStack_entries) && info.promptStack_entries.length > 0) {
                        savedEntries = info.promptStack_entries;
                        console.log('[PromptStack] Restoring from promptStack_entries:', savedEntries);
                    }

                    // Re-setup preview widgets and control buttons
                    setTimeout(() => {
                        createPreviewWidgets();

                        const previewIndex = this.widgets.findIndex(w => w.name === 'preview_text');
                        if (previewIndex !== -1) {
                            const reloadButton = this.addWidget("button", "🔄 Reload DB", "", () => {
                                refreshAllDropdowns.call(this);
                            });
                            const reloadIndex = this.widgets.indexOf(reloadButton);
                            if (reloadIndex > previewIndex + 1) {
                                this.widgets.splice(reloadIndex, 1);
                                this.widgets.splice(previewIndex + 1, 0, reloadButton);
                            }

                            const addButton = this.addWidget("button", "➕ Add Prompt Entry", "", () => { addPromptEntry.call(this); });
                            const addIndex = this.widgets.indexOf(addButton);
                            const currentReloadIndex = this.widgets.indexOf(reloadButton);
                            if (addIndex > currentReloadIndex + 1) {
                                this.widgets.splice(addIndex, 1);
                                this.widgets.splice(currentReloadIndex + 1, 0, addButton);
                            }
                        }
                    }, 50);

                    // Add prompt widgets for each saved entry
                    for (let i = 0; i < savedEntries.length; i++) {
                        console.log(`[PromptStack] Adding prompt entry #${i+1}:`, savedEntries[i]);
                        await addPromptEntry.call(this, savedEntries[i], i + 1);
                    }

                    console.log('[PromptStack] Widgets after restore:', this.widgets.map(w => w.name || w.label || w.type));

                    // Final refresh
                    setTimeout(async () => {
                        console.log('[PromptStack] Final refresh of all dropdowns after restore');
                        await refreshAllDropdowns();
                    }, 200);
                };

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
                    const sepWidget = this.widgets.find(w => w.name === 'separator');
                    if (sepWidget) {
                        inputs['separator'] = sepWidget.value;
                    }
                    return inputs;
                };

                this.computeSize();
                this.setDirtyCanvas(true, true);

                return r;
            };
        }
    }
});
