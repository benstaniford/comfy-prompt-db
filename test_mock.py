import sys
import os

# Add the ComfyUI path to sys.path
sys.path.insert(0, 'c:/Users/Ben/Programs/ComfyUI')

# Mock the folder_paths module since we don't have ComfyUI running
class MockFolderPaths:
    @staticmethod
    def get_folder_paths(folder_type):
        if folder_type == "checkpoints":
            return ["c:/Users/Ben/Programs/ComfyUI/models/checkpoints"]
        elif folder_type == "output":
            return ["c:/Users/Ben/Programs/ComfyUI/output"]
        return []

# Mock the server module
class MockServer:
    pass

# Mock the web module
class MockWeb:
    @staticmethod
    def json_response(data, status=200):
        return {"data": data, "status": status}

# Replace the imports
sys.modules['folder_paths'] = MockFolderPaths()
sys.modules['server'] = MockServer()
sys.modules['server.PromptServer'] = MockServer()
sys.modules['server.PromptServer.instance'] = MockServer()
sys.modules['server.PromptServer.instance.routes'] = MockServer()
sys.modules['aiohttp'] = MockServer()
sys.modules['aiohttp.web'] = MockWeb()

# Now test the PromptDB class
from prompt_db import PromptDB

# Test INPUT_TYPES
print("Testing INPUT_TYPES...")
try:
    input_types = PromptDB.INPUT_TYPES()
    print("INPUT_TYPES successful:")
    print("  Categories:", input_types['required']['category'][0])
    print("  Prompt names:", input_types['required']['prompt_name'][0])
    print("  Category default:", input_types['required']['category'][1].get('default', 'No default'))
    print("  Prompt name default:", input_types['required']['prompt_name'][1].get('default', 'No default'))
except Exception as e:
    print("Error in INPUT_TYPES:", e)
    import traceback
    traceback.print_exc()

# Test creating an instance
print("\nTesting instance creation...")
try:
    instance = PromptDB()
    print("Instance created successfully")
    print("  prompts_file:", instance.prompts_file)
    print("  file exists:", os.path.exists(instance.prompts_file))
except Exception as e:
    print("Error creating instance:", e)
    import traceback
    traceback.print_exc()
