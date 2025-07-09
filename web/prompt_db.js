import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

console.log("Prompt DB JavaScript file loaded!");

// Extension for Prompt DB
app.registerExtension({
    name: "PromptDB",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        console.log("beforeRegisterNodeDef called for:", nodeData.name);
        
        if (nodeData.name === "PromptDB") {
            console.log("Registering Prompt DB");
            
            // Modify the input types to make category and prompt_name into combo widgets
            if (nodeData.input && nodeData.input.required) {
                // Convert category to combo
                nodeData.input.required.category = [[], {"default": ""}];
                // Convert prompt_name to combo
                nodeData.input.required.prompt_name = [[], {"default": ""}];
            }
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                console.log("Prompt DB Node Created - widgets:", this.widgets?.map(w => w.name));
                
                // Find the input widgets
                const categoryWidget = this.widgets?.find(w => w.name === "category");
                const promptNameWidget = this.widgets?.find(w => w.name === "prompt_name");
                const promptTextWidget = this.widgets?.find(w => w.name === "prompt_text");
                
                console.log("Found widgets:", { 
                    category: !!categoryWidget, 
                    promptName: !!promptNameWidget, 
                    promptText: !!promptTextWidget 
                });
                
                if (categoryWidget && promptNameWidget && promptTextWidget) {
                    console.log("Adding functionality to Prompt DB node");
                    
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
                                categoryWidget.options.values = data.categories || [];
                                console.log("Loaded categories:", data.categories);
                            }
                        } catch (error) {
                            console.error("Error loading categories:", error);
                        }
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
                                promptNameWidget.options.values = data.prompts || [];
                                promptNameWidget.value = "";
                                promptTextWidget.value = "";
                                console.log("Loaded prompts for category", category, ":", data.prompts);
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
                                promptTextWidget.callback && promptTextWidget.callback(data.prompt_text || "");
                                console.log("Loaded prompt text:", data.prompt_text);
                            }
                        } catch (error) {
                            console.error("Error loading prompt text:", error);
                        }
                    };
                    
                    // Override category widget callback
                    const originalCategoryCallback = categoryWidget.callback;
                    categoryWidget.callback = function(value) {
                        console.log("Category selected:", value);
                        if (originalCategoryCallback) {
                            originalCategoryCallback.call(this, value);
                        }
                        if (value) {
                            loadPrompts(value);
                        }
                    };
                    
                    // Override prompt name widget callback
                    const originalPromptNameCallback = promptNameWidget.callback;
                    promptNameWidget.callback = function(value) {
                        console.log("Prompt name selected:", value);
                        if (originalPromptNameCallback) {
                            originalPromptNameCallback.call(this, value);
                        }
                        if (value && categoryWidget.value) {
                            loadPromptText(categoryWidget.value, value);
                        }
                    };
                    
                    // Add Save button
                    console.log("Adding save button");
                    this.addWidget("button", "💾 Save", "", async () => {
                        const category = categoryWidget.value;
                        const promptName = promptNameWidget.value;
                        const promptText = promptTextWidget.value;
                        
                        if (!category || !promptName) {
                            console.log("Category and prompt name are required");
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
                                    console.log("Prompt saved successfully:", data.message);
                                } else {
                                    console.error("Save failed:", data.message);
                                }
                            }
                        } catch (error) {
                            console.error("Error saving prompt:", error);
                        }
                    }, { serialize: false });
                    
                    // Add New button
                    console.log("Adding new button");
                    this.addWidget("button", "📝 New", "", async () => {
                        const category = prompt("Enter category name:");
                        if (!category) return;
                        
                        const promptName = prompt("Enter prompt name:");
                        if (!promptName) return;
                        
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
                                    console.log("New prompt created:", data.message);
                                    // Refresh categories and select the new one
                                    await loadCategories();
                                    categoryWidget.value = category;
                                    categoryWidget.callback && categoryWidget.callback(category);
                                    await loadPrompts(category);
                                    promptNameWidget.value = promptName;
                                    promptNameWidget.callback && promptNameWidget.callback(promptName);
                                    promptTextWidget.value = "";
                                    promptTextWidget.callback && promptTextWidget.callback("");
                                } else {
                                    console.error("Create failed:", data.message);
                                }
                            }
                        } catch (error) {
                            console.error("Error creating prompt:", error);
                        }
                    }, { serialize: false });
                    
                    // Load initial categories
                    loadCategories();
                    
                    console.log("Finished setting up Prompt DB. Total widgets:", this.widgets?.length);
                    this.widgets?.forEach((w, i) => console.log(`Widget ${i}: ${w.name} (${w.type})`));
                    
                    // Force the node to resize to show the new buttons
                    this.computeSize();
                    this.setDirtyCanvas(true, true);
                } else {
                    console.log("Could not find required widgets");
                }
                
                return r;
            };
        }
    }
});
