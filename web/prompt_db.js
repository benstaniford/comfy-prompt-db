import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

console.log("=== PROMPT DB JAVASCRIPT FILE LOADED ===");
console.log("Current time:", new Date().toLocaleTimeString());

// Extension for Prompt DB
app.registerExtension({
    name: "PromptDB",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        console.log("=== beforeRegisterNodeDef called for:", nodeData.name);
        
        if (nodeData.name === "PromptDB") {
            console.log("=== Registering Prompt DB ===");
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
                    console.log("Setting up Prompt DB functionality");
                    
                    // Function to load prompts for a category
                    const loadPrompts = async (category) => {
                        try {
                            console.log("Loading prompts for category:", category);
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
                                console.log("Prompts loaded:", data.prompts);
                                
                                // Update the prompt name dropdown values
                                if (data.prompts && data.prompts.length > 0) {
                                    promptNameWidget.options.values = data.prompts;
                                    promptNameWidget.value = data.prompts[0];
                                    
                                    // If widget has an input element, update it
                                    if (promptNameWidget.inputEl) {
                                        promptNameWidget.inputEl.innerHTML = "";
                                        data.prompts.forEach(prompt => {
                                            const option = document.createElement("option");
                                            option.value = prompt;
                                            option.textContent = prompt;
                                            promptNameWidget.inputEl.appendChild(option);
                                        });
                                        promptNameWidget.inputEl.value = data.prompts[0];
                                    }
                                    
                                    // Load text for the first prompt
                                    await loadPromptText(category, data.prompts[0]);
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
                            console.log("=== Loading prompt text ===");
                            console.log("Category:", category);
                            console.log("Prompt name:", promptName);
                            
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
                            
                            console.log("API response status:", response.status);
                            if (response.ok) {
                                const data = await response.json();
                                console.log("API response data:", data);
                                console.log("Prompt text loaded:", data.prompt_text);
                                
                                promptTextWidget.value = data.prompt_text || "";
                                console.log("Set promptTextWidget.value to:", promptTextWidget.value);
                                
                                // Update the text area DOM element if it exists
                                if (promptTextWidget.inputEl) {
                                    promptTextWidget.inputEl.value = data.prompt_text || "";
                                    console.log("Updated DOM element value");
                                } else {
                                    console.log("No inputEl found on promptTextWidget");
                                }
                                
                                // Trigger the callback to update the node
                                if (promptTextWidget.callback) {
                                    promptTextWidget.callback(data.prompt_text || "");
                                    console.log("Called promptTextWidget callback");
                                } else {
                                    console.log("No callback found on promptTextWidget");
                                }
                                
                                // Force canvas redraw to show changes
                                nodeInstance.setDirtyCanvas(true, true);
                                console.log("Set dirty canvas");
                            } else {
                                console.error("API call failed with status:", response.status);
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
                        console.log("=== Category selected ===", value);
                        if (originalCategoryCallback) {
                            console.log("Calling original category callback");
                            originalCategoryCallback.call(this, value);
                        }
                        if (value) {
                            console.log("Loading prompts for category:", value);
                            loadPrompts(value);
                        } else {
                            console.log("No category value, skipping loadPrompts");
                        }
                    };
                    
                    // Override prompt name widget callback
                    promptNameWidget.callback = function(value) {
                        console.log("=== Prompt name selected ===", value);
                        if (originalPromptNameCallback) {
                            console.log("Calling original prompt name callback");
                            originalPromptNameCallback.call(this, value);
                        }
                        if (value && categoryWidget.value) {
                            console.log("Loading prompt text for category:", categoryWidget.value, "prompt:", value);
                            loadPromptText(categoryWidget.value, value);
                        } else {
                            console.log("Missing value or category:", { value, category: categoryWidget.value });
                        }
                    };
                    
                    // Add Save button
                    console.log("Adding Save button");
                    const saveButton = this.addWidget("button", "💾 Save", "", async () => {
                        console.log("=== Save button clicked ===");
                        const category = categoryWidget.value;
                        const promptName = promptNameWidget.value;
                        const promptText = promptTextWidget.value;
                        
                        console.log("Save data:", { category, promptName, promptText });
                        
                        if (!category || !promptName) {
                            console.log("ERROR: Category and prompt name are required");
                            alert("Category and prompt name are required");
                            return;
                        }
                        
                        try {
                            console.log("Making API call to /prompt_db_save");
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
                            
                            console.log("API response status:", response.status);
                            if (response.ok) {
                                const data = await response.json();
                                console.log("API response data:", data);
                                if (data.success) {
                                    console.log("SUCCESS: Prompt saved successfully:", data.message);
                                    alert("Prompt saved successfully!");
                                } else {
                                    console.error("ERROR: Save failed:", data.message);
                                    alert("Save failed: " + data.message);
                                }
                            } else {
                                console.error("ERROR: API call failed with status:", response.status);
                                alert("API call failed with status: " + response.status);
                            }
                        } catch (error) {
                            console.error("ERROR: Exception during save:", error);
                            alert("Error during save: " + error.message);
                        }
                    }, { serialize: false });
                    console.log("Save button added:", saveButton);
                    
                    // Add New button
                    console.log("Adding New button");
                    const newButton = this.addWidget("button", "📝 New", "", async () => {
                        console.log("New button clicked");
                        const category = prompt("Enter category name:");
                        if (!category) return;
                        
                        const promptName = prompt("Enter prompt name:");
                        if (!promptName) return;
                        
                        console.log("Creating new prompt:", { category, promptName });
                        
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
                                } else {
                                    console.error("Create failed:", data.message);
                                }
                            }
                        } catch (error) {
                            console.error("Error creating prompt:", error);
                        }
                    }, { serialize: false });
                    console.log("New button added:", newButton);
                    
                    // Initialize with current category
                    console.log("Initializing with category:", categoryWidget.value);
                    if (categoryWidget.value) {
                        // Load prompts for the current category
                        loadPrompts(categoryWidget.value).then(() => {
                            // After loading prompts, load the text for the current prompt
                            if (promptNameWidget.value) {
                                console.log("Loading initial prompt text for:", categoryWidget.value, promptNameWidget.value);
                                loadPromptText(categoryWidget.value, promptNameWidget.value);
                            }
                        });
                    }
                    
                    console.log("Finished setting up Prompt DB. Total widgets:", this.widgets?.length);
                    this.widgets?.forEach((w, i) => console.log(`Widget ${i}: ${w.name} (${w.type})`));
                    
                    // Force the node to resize to show the new buttons
                    this.computeSize();
                    this.setDirtyCanvas(true, true);
                } else {
                    console.log("Could not find required widgets. Available widgets:", this.widgets?.map(w => w.name));
                }
                
                return r;
            };
        }
    }
});
