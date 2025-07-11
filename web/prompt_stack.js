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
                
                // Track how many entries are currently visible
                let visibleEntries = 1;
                
                // Initially hide all entries except the first one
                for (let i = 2; i <= 10; i++) {
                    const categoryWidget = this.widgets.find(w => w.name === `prompt_${i}_category`);
                    const promptWidget = this.widgets.find(w => w.name === `prompt_${i}_name`);
                    const enabledWidget = this.widgets.find(w => w.name === `prompt_${i}_enabled`);
                    
                    if (categoryWidget) categoryWidget.type = "hidden";
                    if (promptWidget) promptWidget.type = "hidden";
                    if (enabledWidget) enabledWidget.type = "hidden";
                }
                
                // Set up category handlers for all entries
                for (let i = 1; i <= 10; i++) {
                    setupCategoryHandler(i);
                }
                
                // Function to show the next available entry
                const showNextEntry = () => {
                    if (visibleEntries < 10) {
                        visibleEntries++;
                        const categoryWidget = this.widgets.find(w => w.name === `prompt_${visibleEntries}_category`);
                        const promptWidget = this.widgets.find(w => w.name === `prompt_${visibleEntries}_name`);
                        const enabledWidget = this.widgets.find(w => w.name === `prompt_${visibleEntries}_enabled`);
                        
                        if (categoryWidget) categoryWidget.type = "combo";
                        if (promptWidget) promptWidget.type = "combo";
                        if (enabledWidget) enabledWidget.type = "toggle";
                        
                        this.computeSize();
                        this.setDirtyCanvas(true, true);
                    }
                };
                
                // Function to hide the last visible entry (except the first one)
                const hideLastEntry = () => {
                    if (visibleEntries > 1) {
                        const categoryWidget = this.widgets.find(w => w.name === `prompt_${visibleEntries}_category`);
                        const promptWidget = this.widgets.find(w => w.name === `prompt_${visibleEntries}_name`);
                        const enabledWidget = this.widgets.find(w => w.name === `prompt_${visibleEntries}_enabled`);
                        
                        if (categoryWidget) categoryWidget.type = "hidden";
                        if (promptWidget) promptWidget.type = "hidden";
                        if (enabledWidget) enabledWidget.type = "hidden";
                        
                        visibleEntries--;
                        this.computeSize();
                        this.setDirtyCanvas(true, true);
                    }
                };
                
                // Add the "Add Prompt" button
                const addButton = this.addWidget("button", "➕ Add Prompt Entry", "", () => { 
                    showNextEntry(); 
                });
                
                // Add the "Remove Prompt" button
                const removeButton = this.addWidget("button", "➖ Remove Last Entry", "", () => { 
                    hideLastEntry(); 
                });
                
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
