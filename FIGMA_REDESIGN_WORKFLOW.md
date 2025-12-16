# Figma Redesign Workflow for React Native Screens

## Overview
This guide explains how to use Figma with Cursor's Figma integration to redesign your existing React Native screens efficiently.

## Current Screen Structure
Your app uses:
- **React Native/Expo** (v0.81.5)
- **StyleSheet.create()** for styling
- **SafeAreaView**, **StatusBar** for safe areas
- **ScrollView** for scrollable content
- Custom components with inline styles

## Step-by-Step Redesign Process

### 1. **Design Your Screens in Figma**

#### Before You Start:
- Open your Figma file (or create a new one)
- Make sure the Figma desktop app is running
- Have your current screen open in Cursor for reference

#### Design Best Practices:
- **Use Frames**: Create frames that match mobile screen dimensions (375x812 for iPhone, or use Android sizes)
- **Name Layers Clearly**: Use descriptive names for your components (e.g., "Header", "ProfileCard", "MenuButton")
- **Use Components**: Create reusable components for buttons, cards, input fields
- **Organize with Groups**: Group related elements together
- **Set Constraints**: Use auto-layout for responsive designs
- **Use Design Tokens**: Define colors, spacing, typography as variables/styles

### 2. **Extract Design Code from Figma**

#### Method 1: Get Design Context (Recommended for React Native)
1. In Figma, select the frame/component you want to code
2. Copy the Figma URL or note the file key and node ID
3. In Cursor, use the Figma integration to get design context

#### Method 2: Get Screenshot
- Use the screenshot tool to capture the design for reference
- Compare with your current implementation

### 3. **Using Figma Tools in Cursor**

#### Get Design Context:
```
Tool: mcp_Figma_get_design_context
- fileKey: Your Figma file key (from URL)
- nodeId: The node ID of the frame/component
- clientLanguages: "javascript,typescript"
- clientFrameworks: "react-native"
```

This will give you:
- Generated React Native code matching the design
- Asset download URLs
- Design specifications (colors, spacing, typography)

#### Get Variables/Design Tokens:
```
Tool: mcp_Figma_get_variable_defs
- fileKey: Your Figma file key
- nodeId: The node ID
```

This extracts design tokens (colors, spacing, etc.) that you can use in your StyleSheet.

### 4. **Converting Figma Design to Your Screen Structure**

#### Example Workflow:

**Current Screen Pattern:**
```javascript
// screens/Legal.js
<SafeAreaView style={styles.container}>
  <StatusBar barStyle="dark-content" backgroundColor="#fff" />
  <View style={styles.header}>
    {/* Header content */}
  </View>
  <ScrollView style={styles.content}>
    {/* Scrollable content */}
  </ScrollView>
</SafeAreaView>
```

**After Figma Redesign:**
1. Get design context from Figma
2. Extract the generated code
3. Adapt to your existing structure:
   - Keep your navigation logic
   - Keep your data fetching logic
   - Replace styling with Figma-extracted styles
   - Update component structure to match design

### 5. **Optimization Tips**

#### Design Token Extraction:
```javascript
// Create a designTokens.js file
const designTokens = {
  colors: {
    primary: '#8B5CF6', // From Figma variables
    secondary: '#E5E5E5',
    text: '#000',
    // ... extract from Figma
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    // ... extract from Figma
  },
  typography: {
    h1: { fontSize: 24, fontWeight: 'bold' },
    // ... extract from Figma
  }
};
```

#### Component Pattern:
```javascript
// Extract reusable components from Figma designs
// Example: Button component from Figma
const Button = ({ title, onPress, variant = 'primary' }) => (
  <TouchableOpacity style={[styles.button, styles[variant]]}>
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);
```

#### Style Adaptation:
```javascript
// Figma gives you web-focused styles
// Convert to React Native:
// - Remove CSS-specific properties
// - Convert to StyleSheet format
// - Handle responsive sizing
// - Add SafeAreaView/StatusBar wrappers
```

### 6. **Screen-by-Screen Redesign Checklist**

For each screen you want to redesign:

- [ ] **Design in Figma**
  - [ ] Create frame matching screen dimensions
  - [ ] Design all UI elements
  - [ ] Set up design tokens/variables
  - [ ] Test on different screen sizes in Figma

- [ ] **Extract from Figma**
  - [ ] Get design context
  - [ ] Download assets (images, icons)
  - [ ] Extract design tokens
  - [ ] Get variable definitions

- [ ] **Adapt to Code**
  - [ ] Keep existing navigation logic
  - [ ] Keep existing data/state management
  - [ ] Replace UI components with Figma design
  - [ ] Update StyleSheet with Figma styles
  - [ ] Test on device/emulator

- [ ] **Optimize**
  - [ ] Ensure responsive design
  - [ ] Test on iOS and Android
  - [ ] Verify safe areas work correctly
  - [ ] Check accessibility

### 7. **Quick Start: Redesign One Screen**

#### Example: Redesign Legal.js Screen

1. **In Figma:**
   - Create a new frame: 375x812 (iPhone size)
   - Design your new Legal screen layout
   - Name the frame "Legal Screen"
   - Select the frame

2. **In Cursor:**
   - I can help you get the design context using:
     - File key from Figma URL
     - Node ID of your Legal screen frame

3. **Integration:**
   - I'll extract the code from Figma
   - Adapt it to your React Native structure
   - Preserve your existing functionality
   - Update the screen file

### 8. **Common Patterns**

#### Header Pattern:
```javascript
// Your current pattern
<View style={styles.header}>
  <TouchableOpacity onPress={handleBackPress}>
    <Image source={require('../assets/backarrow.png')} />
  </TouchableOpacity>
  <Text style={styles.title}>TITLE</Text>
  <View style={styles.placeholder} />
</View>
```

#### Card Pattern:
```javascript
// Common card pattern from Figma designs
<View style={styles.card}>
  <Text style={styles.cardTitle}>Title</Text>
  <Text style={styles.cardDescription}>Description</Text>
  <TouchableOpacity style={styles.cardButton}>
    <Text style={styles.buttonText}>Action</Text>
  </TouchableOpacity>
</View>
```

### 9. **Assets Management**

When extracting from Figma:
- **Images**: Download and save to `assets/` folder
- **Icons**: Extract as SVGs or PNGs, add to `assets/`
- **Colors**: Copy hex values to your design tokens
- **Fonts**: Note font families (may need to install custom fonts)

### 10. **Testing Strategy**

1. **Design Review**: Compare Figma design with implemented screen
2. **Functional Testing**: Ensure all interactions still work
3. **Responsive Testing**: Test on different device sizes
4. **Platform Testing**: Verify iOS and Android compatibility

## Next Steps

To start redesigning:
1. **Share your Figma file URL or file key** with a specific screen/frame you want to redesign
2. **Tell me which screen** you want to redesign first (e.g., "Legal.js", "MyAccountScreen.js")
3. **I'll extract the design** and help you implement it

Or I can:
- Create a design tokens file based on your current styles
- Help set up a design system structure
- Extract designs from existing Figma files you share

## Tools Available

- ✅ `mcp_Figma_get_design_context` - Get React Native code from designs
- ✅ `mcp_Figma_get_variable_defs` - Extract design tokens
- ✅ `mcp_Figma_get_screenshot` - Get visual reference
- ✅ `mcp_Figma_get_metadata` - Get structure overview

---

**Ready to redesign?** Share your Figma file URL and the screen you want to start with!

