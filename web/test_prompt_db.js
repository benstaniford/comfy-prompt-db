console.log("=== MINIMAL TEST JS FILE LOADED ===");
console.log("Time:", new Date().toLocaleTimeString());
console.log("Location:", window.location.href);

// Try to register a minimal extension
import { app } from "../../scripts/app.js";

console.log("App imported successfully:", !!app);

app.registerExtension({
    name: "TestPromptDB",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        console.log("=== TEST beforeRegisterNodeDef called ===");
        console.log("Node name:", nodeData.name);
        console.log("Node type:", nodeType);
        
        if (nodeData.name === "PromptDB") {
            console.log("=== FOUND PROMPT DB NODE ===");
        }
    }
});

console.log("=== TEST EXTENSION REGISTERED ===");
