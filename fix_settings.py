#!/usr/bin/env python3
import re

# Read the file
with open('src/pages/settings/SettingsPageNew.tsx', 'r') as f:
    content = f.read()

# Fix 1: Add React Fragment after line containing ") : (" at line ~2947
# Find the pattern and add <>
content = content.replace(
    "                            ) : (\n                            <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-8\">",
    "                            ) : (\n                            <>\n                            <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-8\">"
)

# Fix 2: Add closing fragment and proper closing tags before "/* Invoice Settings Tab */"
# Find the section with the button and add proper closing
pattern = r"(                                {saving \? 'Menyimpan\.\.\.' : 'Simpan Perubahan'}\n                                </button>\n                            </div>\n                            </div>\n                    \)}\n                </div>\n                    \)}\n\n                {/\* Invoice Settings Tab \*/})"

replacement = r"                                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}\n                                </button>\n                            </div>\n                            </>\n                            )}\n                        </div>\n                    )}\n\n                    {/* Invoice Settings Tab */}"

content = re.sub(pattern, replacement, content)

# Write the file back
with open('src/pages/settings/SettingsPageNew.tsx', 'w') as f:
    f.write(content)

print("File fixed successfully!")
