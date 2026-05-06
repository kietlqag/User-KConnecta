import re
import sys

path = r'd:\hk2nam4\KLTN\User\User_frontend\src\features\messenger\pages\MessengerPage.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern 1: button has className="..."
# We add cursor-pointer if not already present
def add_cursor_pointer(match):
    prefix = match.group(1)
    classes = match.group(2)
    suffix = match.group(3)
    if 'cursor-pointer' not in classes:
        # Add a space if classes is not empty
        new_classes = classes.strip()
        if new_classes:
            new_classes += ' cursor-pointer'
        else:
            new_classes = 'cursor-pointer'
        return f'{prefix}{new_classes}{suffix}'
    return match.group(0)

# Replace in className="..." or className={...}
# For simplicity, we handle className="..." first as it's most common in this file
content = re.sub(r'(className=")([^"]*)(")', add_cursor_pointer, content)

# Pattern 2: button has no className
# We find <button tags that don't have className attribute
def handle_no_classname(match):
    tag_content = match.group(1)
    if 'className' not in tag_content:
        return f'<button className="cursor-pointer"{tag_content}>'
    return match.group(0)

content = re.sub(r'<button([^>]*)>', handle_no_classname, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
