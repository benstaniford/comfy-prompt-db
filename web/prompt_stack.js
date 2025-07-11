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
                
                // Function to add a new prompt entry
                const addPromptEntry = async () => {
                    // Count current prompt entries by enabled toggles
                    const entryNum = this.widgets.filter(w => w.name.startsWith("prompt_") && w.name.endsWith("_enabled")).length + 1;

                    // Get categories and prompts from the first entry
                    const firstCategoryWidget = this.widgets.find(w => w.name === "prompt_1_category");
                    const firstPromptWidget = this.widgets.find(w => w.name === "prompt_1_name");

                    if (firstCategoryWidget && firstPromptWidget) {
                        const categories = firstCategoryWidget.options.values;
                        // Use the currently selected category from the first widget, not the first category
                        let selectedCategory = firstCategoryWidget.value || categories[0];
                        let prompts = [];
                        if (selectedCategory) {
                            prompts = await loadPrompts(selectedCategory);
                        }
                        // Use the currently selected prompt from the first widget, not the first prompt
                        let selectedPrompt = firstPromptWidget.value || (prompts.length > 0 ? prompts[0] : "");

                        // Add enabled checkbox
                        const enabledWidget = this.addWidget("toggle", `prompt_${entryNum}_enabled`, true, null);
                        // Add category dropdown
                        const categoryWidget = this.addWidget("combo", `prompt_${entryNum}_category`, selectedCategory, null, { values: [...categories] });
                        // Add prompt name dropdown
                        const promptWidget = this.addWidget("combo", `prompt_${entryNum}_name`, selectedPrompt, null, { values: [...prompts] });

                        // Set up category change handler
                        setupCategoryHandler(entryNum);

                        // Add remove button for this entry
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
                        // Load initial prompts for the new category
                        updatePromptDropdown(categoryWidget, promptWidget);
                    }
                    this.computeSize();
                    this.setDirtyCanvas(true, true);
                };
                
                // Add the "Add Prompt" button
                const addButton = this.addWidget("button", "➕ Add Prompt Entry", "", () => { addPromptEntry(); });
                
                // Let ComfyUI handle widget serialization
                this.serialize_widgets = true;
                
                // Force the node to resize
                this.computeSize();
                this.setDirtyCanvas(true, true);
                
                return r;
            };
        }
    }
});
