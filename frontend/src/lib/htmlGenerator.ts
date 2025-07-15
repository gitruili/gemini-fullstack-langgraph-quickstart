import { GoogleGenAI } from '@google/genai';

// API call to generate HTML using GoogleGenAI
const callGoogleGenAIForHTML = async (blueprint: string): Promise<string> => {
  console.log('=== callGoogleGenAIForHTML called ===');
  console.log('Blueprint length:', blueprint.length);
  
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    console.error('VITE_GEMINI_API_KEY is not set');
    throw new Error('VITE_GEMINI_API_KEY is not set in environment variables');
  }

  const prompt = `As a professional frontend developer, generate complete HTML+CSS+JavaScript code based on the following design blueprint.

Requirements:
1. Fixed canvas size: 448px × 597px
2. Generate ALL pages specified in the blueprint (usually 6-10 pages)
3. Multi-page navigation: left/right arrow keys + button navigation
4. Page indicator showing current page/total pages
5. No external images - use CSS gradients and Emoji icons
6. Modern CSS: Flexbox, Grid, gradients
7. Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

CRITICAL Design Quality Requirements:
- HIGH CONTRAST COLORS: Ensure text has minimum 4.5:1 contrast ratio against backgrounds
- Main text should be #1a1a1a or darker on light backgrounds
- Headings should be #000000 or very dark colors
- Avoid light gray (#999, #ccc) text - use dark colors (#333, #444) minimum
- PROPER SPACING: Ensure adequate line-height (1.4-1.6) and letter-spacing
- Prevent text overlap: use sufficient margins and padding between elements
- VISUAL RICHNESS: Use vibrant gradients, colorful backgrounds, and engaging layouts
- SPECIFIC ICONS: Use concrete, recognizable emojis (🚀📱💡🎯📊🔧) not abstract symbols
- ENGAGING DESIGN: Create visually appealing sections with colorful cards, borders, and backgrounds

VISUAL DENSITY & STABILITY Requirements:
- RICH CONTENT: Each page must have substantial visual content, avoid empty/sparse layouts
- CONSISTENT QUALITY: Maintain consistent design quality across all pages
- MULTIPLE ELEMENTS: Include 3-5 distinct visual elements per page minimum
- BALANCED LAYOUT: Use proper proportions, avoid cramped or overly spacious designs
- STRUCTURED HIERARCHY: Clear visual hierarchy with headers, subheaders, and content sections
- DECORATIVE ELEMENTS: Add borders, shadows, gradients, and visual details for richness

Layout Standards:
- Minimum 16px font size for body text
- Minimum 20px font size for headings
- Minimum 8px padding between text elements
- Use colorful gradient backgrounds (#4F46E5 to #7C3AED, #EF4444 to #F97316, etc.)
- Ensure proper z-index and positioning to prevent overlap
- Add visual depth with shadows, borders, and layered elements

Code requirements:
- Compact and concise code structure, minimal comments
- All pages must be included in a single HTML document
- Use simplified CSS class names and structure
- Ensure all pages are properly implemented
- Generate complete, functional code that renders consistently

Generate a complete runnable HTML document including all pages:

Design Blueprint:
${blueprint}`;

  console.log('Sending request to GoogleGenAI API...');
  console.log('Prompt length:', prompt.length);

  try {
    const ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    });
    
    const config = {
      thinkingConfig: {
        thinkingBudget: -1,
      },
      responseMimeType: 'text/plain',
      systemInstruction: [
        {
          text: `You are an expert frontend developer and UI designer with a focus on high-quality, accessible design. Generate complete, functional HTML+CSS+JavaScript code based on design blueprints.

Key Principles:
- ALWAYS ensure high contrast colors (minimum 4.5:1 ratio) for readability
- Create visually engaging and modern designs with proper spacing
- Use vibrant colors and gradients to avoid bland, boring layouts
- Ensure no text overlap or visual clutter
- Prioritize user experience and visual appeal
- Always provide complete, runnable code with all specified pages

CRITICAL: Ensure VISUAL RICHNESS and STABILITY
- Every page must have substantial visual content - never generate sparse/empty layouts
- Maintain consistent quality across all pages
- Include multiple visual elements, proper hierarchy, and decorative details
- Use proper proportions and balanced layouts
- Generate functional, complete code that renders reliably every time`,
        }
      ],
    };
    
    const model = 'gemini-2.5-pro';
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ];

    console.log('Generating content...');
    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let htmlContent = '';
    for await (const chunk of response) {
      if (chunk.text) {
        htmlContent += chunk.text;
      }
    }

    console.log('Raw API response length:', htmlContent.length);
    console.log('Raw API response preview:', htmlContent.substring(0, 500));
    
    // Check if response appears to be truncated
    const lastLine = htmlContent.trim().split('\n').pop();
    const isTruncated = !htmlContent.includes('</html>') || 
                      (lastLine && lastLine.length < 10) || 
                      htmlContent.endsWith('{') || 
                      htmlContent.endsWith(':') ||
                      htmlContent.endsWith(';') ||
                      htmlContent.endsWith(',');
    
    console.log('Response appears truncated:', isTruncated);
    console.log('Last 200 characters:', htmlContent.slice(-200));
    
    // Extract HTML from markdown code blocks if present
    const codeBlockMatch = htmlContent.match(/```html\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      htmlContent = codeBlockMatch[1];
      console.log('Extracted HTML from code block, length:', htmlContent.length);
    }
    
    // Additional extraction patterns for different formats
    if (!htmlContent.includes('<!DOCTYPE html>')) {
      const htmlStartPatterns = [
        /```html\s*\n([\s\S]*)/,
        /```\s*\n(<!DOCTYPE html[\s\S]*)/,
        /(<!DOCTYPE html[\s\S]*)/
      ];
      
      for (const pattern of htmlStartPatterns) {
        const match = htmlContent.match(pattern);
        if (match) {
          htmlContent = match[1];
          console.log('Extracted HTML using pattern, length:', htmlContent.length);
          break;
        }
      }
    }
    
    // Ensure we have a complete HTML document
    if (!htmlContent.includes('<!DOCTYPE html>')) {
      console.warn('HTML content does not appear to be a complete document');
      console.log('Content starts with:', htmlContent.substring(0, 200));
    }
    
    // Handle truncated responses
    if (isTruncated) {
      console.warn('⚠️  API response appears to be truncated. This may result in incomplete HTML.');
      // alert('Warning: The generated HTML appears to be incomplete due to response length limits. The visualization may not display all pages correctly.');
    }
    
    // Validate the HTML contains multi-page structure
    const pageCount = (htmlContent.match(/id="page-?\d+"/g) || []).length;
    console.log('Generated HTML page count:', pageCount);
    
    if (pageCount === 0) {
      console.warn('Generated HTML appears to have no pages, this might be incorrect');
      const altPageCount = (htmlContent.match(/class="page"/g) || []).length;
      console.log('Alternative page count detection:', altPageCount);
    }
    
    console.log('Final HTML length:', htmlContent.length);
    console.log('HTML validation - DOCTYPE:', htmlContent.includes('<!DOCTYPE html>'));
    console.log('HTML validation - closing tag:', htmlContent.includes('</html>'));
    
    return htmlContent;
  } catch (error) {
    console.error('Error calling GoogleGenAI API for HTML:', error);
    throw error;
  }
};

// Fallback HTML generator
const generateFallbackHTML = (content: string): string => {
  const lines = content.split('\n').filter(line => line.trim());
  const listItems = lines.filter(line => line.match(/^[-*]\s/) || line.match(/^\d+\.\s/))
    .slice(0, 8).map(item => item.replace(/^[-*\d.]\s*/, ''));
  const title = content.split('\n')[0] || 'AI 响应内容';
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 响应内容</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            width: 448px; 
            height: 597px; 
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 24px;
        }
        .container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .header {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 3px solid #4F46E5;
            text-align: center;
        }
        .header h1 {
            font-size: 1.8rem;
            color: #1a1a1a;
            margin-bottom: 8px;
            line-height: 1.4;
            font-weight: 700;
        }
        .header .icon {
            font-size: 2rem;
            margin-bottom: 12px;
            display: block;
        }
        .content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            flex: 1;
        }
        .content-item {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 12px;
            padding: 18px;
            border-left: 4px solid #6366f1;
            font-size: 0.9rem;
            line-height: 1.5;
            color: #1a1a1a;
            display: flex;
            flex-direction: column;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s ease;
        }
        .content-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
        }
        .content-item .bullet {
            color: #4F46E5;
            margin-right: 8px;
            font-weight: bold;
            font-size: 1.1rem;
        }
        .highlight {
            background: linear-gradient(135deg, #fef3c7 0%, #f59e0b 100%);
            border-left-color: #f59e0b;
            color: #1a1a1a;
        }
        .highlight:nth-child(even) {
            background: linear-gradient(135deg, #dcfce7 0%, #16a34a 100%);
            border-left-color: #16a34a;
        }
        .highlight:nth-child(3n) {
            background: linear-gradient(135deg, #fce7f3 0%, #ec4899 100%);
            border-left-color: #ec4899;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">🚀</div>
            <h1>${title.slice(0, 50)}</h1>
        </div>
                 <div class="content-grid">
             ${listItems.map((item, i) => {
              const isHighlight = i % 2 === 0 ? 'highlight' : '';
              return `<div class="content-item ${isHighlight}">
                <span class="bullet">•</span>
                ${item.slice(0, 80)}
              </div>`;
             }).join('')}
         </div>
    </div>
</body>
</html>`;
};

// Main HTML generation function - uses GoogleGenAI API
export const generateHTML = async (blueprint: string): Promise<string> => {
  console.log('=== DEBUG: generateHTML called ===');
  console.log('Blueprint length:', blueprint.length);
  console.log('Blueprint preview:', blueprint.substring(0, 200) + '...');
  
  try {
    console.log('Calling GoogleGenAI API for HTML generation...');
    const generatedHTML = await callGoogleGenAIForHTML(blueprint);
    console.log('Successfully generated HTML from GoogleGenAI API, length:', generatedHTML.length);
    
    // Additional validation
    if (generatedHTML.length < 1000) {
      console.warn('Generated HTML seems very short, might be incomplete');
    }
    
    if (!generatedHTML.includes('<!DOCTYPE html>') && !generatedHTML.includes('<html')) {
      console.warn('Generated HTML might not be a complete HTML document');
    }
    
    return generatedHTML;
  } catch (error) {
    console.error('Error generating HTML via GoogleGenAI API:', error);
    console.log('Falling back to generateFallbackHTML');
    
    // Extract some content from blueprint for fallback
    const fallbackContent = blueprint.substring(0, 1000);
    const fallbackHTML = generateFallbackHTML(fallbackContent);
    console.log('Fallback HTML generated, length:', fallbackHTML.length);
    return fallbackHTML;
  }
};

// Export fallback function as well for direct use
export { generateFallbackHTML }; 