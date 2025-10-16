# Address Field Update - Street Only

## ✅ **Change Implemented**

Updated the address autocomplete to **only populate the street address** (street number + street name) in Address Line 1, keeping City, State, and Zip Code as separate fields for independent input.

## 📝 **What Changed**

### **Before**:
- Address autocomplete would fill all fields:
  - Full Address: "123 Main St, New York, NY 10001"
  - Address Line 1: "123 Main St"
  - City: "New York"
  - State: "NY"
  - Zip: "10001"

### **After**:
- Address autocomplete now only fills the street:
  - Address Line 1: "123 Main St"
  - City: [Empty - user fills manually]
  - State: [Empty - user fills manually]
  - Zip: [Empty - user fills manually]

## 🔧 **Implementation Details**

### **Modified Functions**:

1. **fetchAddressSuggestions**:
   ```javascript
   // Now shows only street in dropdown suggestions
   const streetOnly = `${props.housenumber || ''} ${props.street || ''}`.trim();
   return {
     place_id: feature.properties.place_id,
     description: streetOnly || fullInfo, // Only street shown
     properties: feature.properties
   };
   ```

2. **getPlaceDetails**:
   ```javascript
   // Only extracts street number and street name
   const streetAddress = `${props.housenumber || ''} ${props.street || ''}`.trim();
   
   return {
     fullAddress: streetAddress, // Only street info
     address1: streetAddress,    // Only street number + name
     city: props.city || '',     // Still available but not auto-filled
     state: props.state_code || props.state || '',
     zip: props.postcode || ''
   };
   ```

3. **UI Change**:
   ```javascript
   // Updated placeholder text
   <TextInput 
     placeholder="Street Address*"  // Was "Search for your address*"
     value={form.fullAddress} 
     onChangeText={(text) => handleChange('fullAddress', text)} 
   />
   ```

## 📱 **User Experience**

### **New Workflow**:
1. User types "123 Main" in Street Address field
2. Dropdown shows street suggestions: "123 Main St", "123 Main Ave", etc.
3. User selects "123 Main St"
4. Only Address Line 1 populates with "123 Main St"
5. User then manually enters:
   - City (e.g., "New York")
   - State (e.g., "NY")
   - Zip (e.g., "10001")

### **Benefits**:
- ✅ **Clearer Separation**: Each field has a distinct purpose
- ✅ **More Control**: Users can enter different city/state/zip if needed
- ✅ **Flexible**: Useful for businesses with different billing addresses
- ✅ **Simpler Suggestions**: Dropdown shows only relevant street info
- ✅ **Less Clutter**: Cleaner autocomplete experience

## 🎯 **Why This Approach**

1. **Better UX**: Users have more control over their address components
2. **Flexibility**: Allows for edge cases (P.O. boxes, different cities, etc.)
3. **Cleaner Interface**: Less overwhelming with focused autocomplete
4. **Clear Intent**: Field label matches what actually populates
5. **User Preference**: Matches user's requested behavior

## 📋 **Fields Structure**

```
Home Address
├─ Street Address* ← [Autocomplete enabled, shows street only]
├─ Address Line 2 (Optional) ← [Manual input]
├─ City* ← [Manual input]
├─ State* ← [Manual input]
└─ Zip* ← [Manual input]
```

The implementation maintains the API integration and all functionality while giving users better control over their address input.
