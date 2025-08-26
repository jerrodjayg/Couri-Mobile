# EasyOCR Integration for ProductDetails Screen

## Overview
This document explains how to integrate EasyOCR (Python-based OCR library) with the ProductDetails screen to extract product information from Facebook Marketplace screenshots.

## Current Implementation
The ProductDetails screen currently uses mock data for demonstration purposes. To implement real OCR extraction, you'll need to:

1. **Set up a Python backend service** with EasyOCR
2. **Send screenshots** from React Native to the backend
3. **Process images** with EasyOCR
4. **Return structured data** to the React Native app

## Implementation Options

### Option 1: Python Flask/FastAPI Backend (Recommended)

#### Backend Setup (Python)
```python
# requirements.txt
easyocr==1.7.0
flask==2.3.3
pillow==10.0.1
numpy==1.24.3

# app.py
from flask import Flask, request, jsonify
import easyocr
import cv2
import numpy as np
from PIL import Image
import io
import re

app = Flask(__name__)

# Initialize EasyOCR reader
reader = easyocr.Reader(['en'])

@app.route('/extract-product-info', methods=['POST'])
def extract_product_info():
    try:
        # Get image from request
        image_file = request.files['image']
        image = Image.open(image_file.stream)
        
        # Convert to numpy array for OpenCV
        image_np = np.array(image)
        
        # Extract text using EasyOCR
        results = reader.readtext(image_np)
        
        # Extract all text
        extracted_text = ' '.join([text[1] for text in results])
        
        # Parse product information
        product_info = parse_product_info(extracted_text)
        
        return jsonify({
            'success': True,
            'data': product_info
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def parse_product_info(text):
    """Parse extracted text to find product details"""
    
    # Initialize result
    result = {
        'productName': '',
        'price': '',
        'description': '',
        'imageUrl': ''
    }
    
    # Extract price (look for currency patterns)
    price_patterns = [
        r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)',  # $280, $1,234.56
        r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*dollars?',  # 280 dollars
        r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*USD'  # 280 USD
    ]
    
    for pattern in price_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result['price'] = match.group(1).replace(',', '')
            break
    
    # Extract product name (look for common patterns)
    # This is more complex and may require AI/ML training
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if len(line) > 10 and not line.isdigit() and '$' not in line:
            if not result['productName']:
                result['productName'] = line
            elif len(line) > len(result['productName']):
                result['productName'] = line
    
    # Extract description (remaining text)
    description_lines = []
    for line in lines:
        line = line.strip()
        if (line and 
            line != result['productName'] and 
            line != result['price'] and
            len(line) > 20):
            description_lines.append(line)
    
    result['description'] = ' '.join(description_lines[:3])  # First 3 lines
    
    return result

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

#### React Native Integration
Update the `extractProductInfo` function in `ProductDetails.js`:

```javascript
const extractProductInfo = async (screenshotUri) => {
  try {
    setLoading(true);
    
    // Create form data for image upload
    const formData = new FormData();
    formData.append('image', {
      uri: screenshotUri,
      type: 'image/jpeg',
      name: 'screenshot.jpg'
    });
    
    // Send to Python backend
    const response = await fetch('http://your-backend-url:5000/extract-product-info', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    const result = await response.json();
    
    if (result.success) {
      setExtractedData(result.data);
      await saveToSupabase(result.data);
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('Extraction error:', error);
    Alert.alert('Error', 'Failed to extract product information');
  } finally {
    setLoading(false);
  }
};
```

### Option 2: Cloud OCR Services

#### Google Cloud Vision API
```javascript
const extractProductInfo = async (screenshotUri) => {
  try {
    setLoading(true);
    
    // Convert image to base64
    const base64Image = await convertImageToBase64(screenshotUri);
    
    // Send to Google Cloud Vision API
    const response = await fetch('https://vision.googleapis.com/v1/images:annotate?key=YOUR_API_KEY', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          image: {
            content: base64Image
          },
          features: [{
            type: 'TEXT_DETECTION'
          }]
        }]
      })
    });
    
    const result = await response.json();
    
    // Parse the extracted text
    const extractedText = result.responses[0]?.textAnnotations[0]?.description || '';
    const productInfo = parseProductInfo(extractedText);
    
    setExtractedData(productInfo);
    await saveToSupabase(productInfo);
    
  } catch (error) {
    console.error('Extraction error:', error);
    Alert.alert('Error', 'Failed to extract product information');
  } finally {
    setLoading(false);
  }
};
```

#### OpenAI Vision API
```javascript
const extractProductInfo = async (screenshotUri) => {
  try {
    setLoading(true);
    
    // Convert image to base64
    const base64Image = await convertImageToBase64(screenshotUri);
    
    // Send to OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${YOUR_OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: 'Extract the product name, price, and description from this Facebook Marketplace listing. Return as JSON with keys: productName, price, description.'
          }, {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }]
        }],
        max_tokens: 500
      })
    });
    
    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    // Parse JSON response
    const productInfo = JSON.parse(content);
    
    setExtractedData(productInfo);
    await saveToSupabase(productInfo);
    
  } catch (error) {
    console.error('Extraction error:', error);
    Alert.alert('Error', 'Failed to extract product information');
  } finally {
    setLoading(false);
  }
};
```

## Helper Functions

### Convert Image to Base64
```javascript
const convertImageToBase64 = async (uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};
```

### Parse Product Info (Basic)
```javascript
const parseProductInfo = (text) => {
  const result = {
    productName: '',
    price: '',
    description: '',
    imageUrl: ''
  };
  
  // Extract price
  const priceMatch = text.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (priceMatch) {
    result.price = priceMatch[1].replace(',', '');
  }
  
  // Extract product name (first line that's not price)
  const lines = text.split('\n').filter(line => line.trim());
  for (const line of lines) {
    if (line.trim() && !line.includes('$') && line.length > 5) {
      result.productName = line.trim();
      break;
    }
  }
  
  // Extract description (remaining text)
  const descriptionLines = lines.filter(line => 
    line !== result.productName && 
    !line.includes('$') &&
    line.length > 10
  );
  result.description = descriptionLines.slice(0, 3).join(' ');
  
  return result;
};
```

## Environment Variables
Create a `.env` file for your API keys:

```bash
# .env
GOOGLE_CLOUD_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key
BACKEND_URL=http://localhost:5000
```

## Testing
1. **Test with sample images** before deploying
2. **Validate extracted data** accuracy
3. **Handle edge cases** (no price found, multiple prices, etc.)
4. **Test error handling** for network failures

## Performance Considerations
- **Image compression** before sending to reduce API costs
- **Caching** extracted results
- **Offline fallback** for network issues
- **Batch processing** for multiple images

## Security
- **API key protection** - never expose in client code
- **Input validation** - sanitize extracted text
- **Rate limiting** - prevent abuse
- **User authentication** - ensure users can only access their own data
