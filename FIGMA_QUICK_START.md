# Figma Quick Start Guide

## How to Use Figma Integration for Your Screens

### Prerequisites
1. ✅ Figma desktop app is installed and running
2. ✅ You have a Figma file with your designs
3. ✅ Cursor is open with this project

### Quick Workflow

#### Step 1: Get Your Figma File Information

**From Figma URL:**
```
https://figma.com/design/YOUR_FILE_KEY/YourFileName?node-id=1-2
                         ^^^^^^^^^^^^                        ^^^^
                         fileKey                            nodeId
```

**Or from Figma Desktop:**
1. Select your frame/component
2. Right-click → Copy link
3. Extract fileKey and nodeId from URL

#### Step 2: Request Design Extraction

**In Cursor chat, say:**
```
"Extract the design from Figma file [FILE_KEY] node [NODE_ID] for my [SCREEN_NAME] screen"
```

**Or provide the Figma URL:**
```
"Get design from this Figma URL: https://figma.com/design/..."
```

**I will:**
1. ✅ Extract the design code
2. ✅ Download any assets (images, icons)
3. ✅ Extract design tokens (colors, spacing)
4. ✅ Adapt to your React Native structure
5. ✅ Preserve your existing functionality

#### Step 3: Review and Integrate

I'll provide you with:
- Updated screen code matching Figma design
- Asset files to add to your `assets/` folder
- Updated design tokens in `utils/designTokens.js`
- Instructions for any custom components needed

### Example: Redesign Legal.js Screen

**Current File:** `screens/Legal.js`

**What I need:**
1. Your Figma file key
2. Node ID of the Legal screen design in Figma
3. Or the full Figma URL

**What I'll do:**
1. Extract design context from Figma
2. Generate React Native code
3. Adapt it to your existing `Legal.js` structure
4. Keep your navigation and logic intact
5. Update only the UI/styling

### Example: Redesign MyAccountScreen.js

Same process:
1. Share Figma file key + node ID
2. I extract the design
3. Adapt to your existing code structure
4. Preserve all functionality (user data, navigation, etc.)

### What Gets Preserved

When redesigning, I will **keep**:
- ✅ Navigation logic
- ✅ Data fetching (useEffect, AsyncStorage, etc.)
- ✅ State management
- ✅ Event handlers
- ✅ Business logic
- ✅ Existing functionality

I will **update**:
- 🎨 UI components structure
- 🎨 Styling (colors, spacing, typography)
- 🎨 Layout arrangement
- 🎨 Visual design elements

### Batch Redesign

**Want to redesign multiple screens?**

Just tell me:
```
"Redesign these screens from Figma:
1. Legal.js - Figma URL: [URL]
2. MyAccountScreen.js - Figma URL: [URL]
3. DriverPasswordScreen.js - Figma URL: [URL]"
```

I'll process them one by one.

### Design Token Sync

When extracting from Figma, I'll also:
1. Extract design variables/tokens
2. Update `utils/designTokens.js`
3. Show you what changed

You can then use these tokens across all screens:
```javascript
import { colors, spacing, typography } from '../utils/designTokens';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
  },
  title: {
    ...typography.h2,
  },
});
```

### Getting Started Right Now

**Option 1: Share Figma Information**
- Share your Figma file URL or file key + node ID
- Tell me which screen to redesign
- I'll do the rest!

**Option 2: I Can Help You Find It**
- Tell me which screen you want to redesign
- If you're not sure about file key/node ID, I can help extract it

**Option 3: Create Design Tokens First**
- I can analyze your current screens
- Extract existing design patterns
- Create a design system foundation
- Then when you design in Figma, we sync the tokens

### Common Questions

**Q: Do I need to redesign all screens at once?**
A: No! Start with one screen, test it, then move to the next.

**Q: Will my app break if I redesign one screen?**
A: No! I preserve all your functionality. Only UI/styling changes.

**Q: Can I preview before implementing?**
A: Yes! I can get a screenshot from Figma first so you can review the design.

**Q: What if Figma design doesn't match exactly?**
A: I'll adapt it to React Native best practices while keeping the design intent.

**Q: Do I need to install anything?**
A: No! The Figma integration is already set up in Cursor.

---

## Ready to Start?

**Just tell me:**
1. Which screen you want to redesign (e.g., "Legal.js")
2. Your Figma file URL or file key + node ID

**Or ask:**
- "Help me extract design tokens from my current screens"
- "Show me how to use the Figma integration"
- "Redesign [SCREEN_NAME] from this Figma URL: [URL]"

