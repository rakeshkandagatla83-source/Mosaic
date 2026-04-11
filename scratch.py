import re

log_path = "/Users/rakeshk/.gemini/antigravity/brain/a237f368-d14d-46aa-862d-7db5670d3623/.system_generated/logs/overview.txt"

with open(log_path, 'r') as f:
    lines = f.readlines()

print("Found log with", len(lines), "lines.")

# Search for the function definitions
in_block = False
block = []

for line in lines:
    if "function CampaignControlsTab" in line or "function BulkUploadTab" in line or "function CampaignImageryTab" in line:
        print("Found:", line.strip()[:100])

