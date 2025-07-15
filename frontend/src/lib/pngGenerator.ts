import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { GoogleGenAI } from '@google/genai';

// Types for PNG generation callbacks
export interface PngGenerationCallbacks {
  setIsGeneratingPNG: (loading: boolean) => void;
  setPngError: (error: string | null) => void;
  setGeneratedPNGs: (pngs: string[]) => void;
}

// Interface for additional content to be included in ZIP package
export interface PngAdditionalContent {
  aiResponseContent: string;
  xiaohongshuTitle: string;
  xiaohongshuBody: string;
  userQuestion: string;
}

// PNG generation options
export interface PngGenerationOptions {
  forceWhiteBackground?: boolean; // Force white background instead of auto-detection
  customBackgroundColor?: string; // Custom background color (hex)
}

// Helper function to create safe filename from user question
const createSafeFilename = (userQuestion: string): string => {
  return userQuestion
    .slice(0, 50)
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase() || 'ai_response';
};

// Helper function to create timestamp
const createTimestamp = (): string => {
  return new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
};

// Helper function to calculate optimal dimensions for element
const calculateOptimalDimensions = (element: HTMLElement): { width: number; height: number } => {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  
  // Get actual content dimensions including padding but excluding margin
  const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
  const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
  const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
  const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
  
  const contentWidth = Math.max(
    element.scrollWidth,
    element.offsetWidth,
    rect.width + paddingLeft + paddingRight
  );
  
  const contentHeight = Math.max(
    element.scrollHeight,
    element.offsetHeight,
    rect.height + paddingTop + paddingBottom
  );
  
  // For fixed-size designs, prefer the standard social media dimensions
  // But allow flexibility for content that doesn't fit
  const targetWidth = 448;
  const targetHeight = 597;
  
  // If content is close to target size, use target size to avoid scaling issues
  const widthTolerance = 50;
  const heightTolerance = 50;
  
  const finalWidth = Math.abs(contentWidth - targetWidth) <= widthTolerance ? 
    targetWidth : Math.max(contentWidth, 400);
  const finalHeight = Math.abs(contentHeight - targetHeight) <= heightTolerance ? 
    targetHeight : Math.max(contentHeight, 500);
  
  return {
    width: Math.ceil(finalWidth),
    height: Math.ceil(finalHeight)
  };
};

// Helper function to detect if element has custom background
const detectBackground = (element: HTMLElement, options?: PngGenerationOptions): string => {
  // If user forces white background, return white
  if (options?.forceWhiteBackground) {
    return '#ffffff';
  }
  
  // If user provides custom background color, use it
  if (options?.customBackgroundColor) {
    return options.customBackgroundColor;
  }
  
  const computedStyle = window.getComputedStyle(element);
  const bgColor = computedStyle.backgroundColor;
  const bgImage = computedStyle.backgroundImage;
  
  console.log('检测背景 - bgColor:', bgColor, 'bgImage:', bgImage);
  
  // Check if this looks like a card or infographic design
  const hasCardStyling = computedStyle.borderRadius !== '0px' || 
                        computedStyle.boxShadow !== 'none' ||
                        computedStyle.border !== '0px none';
  
  // Check if element has gradient background
  const hasGradient = bgImage && (bgImage.includes('gradient') || 
                      bgImage.includes('linear-gradient') || 
                      bgImage.includes('radial-gradient'));
  
  console.log('设计特征 - hasCardStyling:', hasCardStyling, 'hasGradient:', hasGradient);
  
  // Function to parse RGB color and determine if it's dark
  const isDarkColor = (color: string): boolean => {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
      return false;
    }
    
    // Parse rgb/rgba colors
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      // Calculate relative luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance < 0.5; // Dark if luminance < 50%
    }
    
    return false;
  };
  
  // Function to detect dark background from gradient
  const hasGradientWithDarkColors = (bgImage: string): boolean => {
    if (!bgImage || !bgImage.includes('gradient')) return false;
    
    // Check for common dark gradient patterns
    const darkPatterns = [
      /#[0-6][0-9a-f]{5}/gi, // Dark hex colors starting with 0-6
      /rgb\([0-9]{1,2},\s*[0-9]{1,2},\s*[0-9]{1,2}\)/gi, // Dark RGB values
      /rgba\([0-9]{1,2},\s*[0-9]{1,2},\s*[0-9]{1,2}/gi, // Dark RGBA values
    ];
    
    return darkPatterns.some(pattern => pattern.test(bgImage));
  };
  
  // Check for dark text indicating a light background is expected
  const hasDarkText = (): boolean => {
    const textElements = element.querySelectorAll('*');
    for (const el of textElements) {
      const style = window.getComputedStyle(el as Element);
      const color = style.color;
      if (isDarkColor(color)) {
        return true;
      }
    }
    return false;
  };
  
  // Check for light text indicating a dark background
  const hasLightText = (): boolean => {
    const textElements = element.querySelectorAll('*');
    for (const el of textElements) {
      const style = window.getComputedStyle(el as Element);
      const color = style.color;
      // Check for white or very light colors
      if (color === 'rgb(255, 255, 255)' || 
          color === 'rgba(255, 255, 255, 1)' || 
          color === '#ffffff' || 
          color === '#fff' ||
          color.match(/rgb\(2[5-9][0-9]|rgb\(255/)) {
        return true;
      }
    }
    return false;
  };
  
  // For gradient backgrounds, analyze the colors
  if (hasGradient) {
    console.log('检测到渐变背景，分析颜色...');
    
    // If gradient has dark colors or content has light text, preserve the gradient
    if (hasGradientWithDarkColors(bgImage) || hasLightText()) {
      console.log('检测到深色渐变或白字，使用透明背景保持原样');
      return 'transparent';
    }
    
    // For light gradients, use transparent to preserve them
    return 'transparent';
  }
  
  // For solid background colors
  if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
    console.log('检测到实体背景色:', bgColor);
    
    // If it's a dark background color, preserve it
    if (isDarkColor(bgColor)) {
      console.log('检测到深色背景，保持原样');
      return bgColor;
    }
    
    // For light backgrounds, use the detected color
    return bgColor;
  }
  
  // For transparent or unset backgrounds, infer from text color
  if (hasLightText()) {
    console.log('检测到白字，使用深色背景');
    // Common dark backgrounds for designs with white text
    return '#1a1a1a';
  }
  
  if (hasDarkText()) {
    console.log('检测到深色文字，使用白色背景');
    return '#ffffff';
  }
  
  // For card-like designs with borders/shadows, use transparent to preserve the card effect
  if (hasCardStyling) {
    return 'transparent';
  }
  
  // Default fallback
  console.log('使用默认白色背景');
  return '#ffffff';
};

export interface PngAuditCallbacks {
  setIsAuditingPNG: (loading: boolean) => void;
  setAuditError: (error: string | null) => void;
  setGeneratedHTML: (html: string) => void;
}

// Core PNG generation function
export const generatePNG = async (
  generatedHTML: string,
  callbacks: PngGenerationCallbacks,
  additionalContent?: PngAdditionalContent,
  options?: PngGenerationOptions
): Promise<void> => {
  if (!generatedHTML) {
    alert('请先生成HTML代码');
    return;
  }

  // For infographic content, use intelligent background detection by default
  const defaultOptions: PngGenerationOptions = {
    forceWhiteBackground: false, // Use intelligent background detection
    ...options // Allow user options to override defaults
  };

  callbacks.setIsGeneratingPNG(true);
  callbacks.setPngError(null);

  try {
    console.log('开始生成PNG图片...');
    
    // Create a hidden iframe to properly render the HTML with all styles
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '448px';
    iframe.style.height = '597px';
    iframe.style.border = 'none';
    iframe.style.background = 'transparent';
    
    document.body.appendChild(iframe);
    
    // Write the HTML content to iframe
    iframe.contentDocument?.open();
    iframe.contentDocument?.write(generatedHTML);
    iframe.contentDocument?.close();
    
    // Wait for the iframe to fully load
    await new Promise((resolve) => {
      iframe.onload = resolve;
      // Balanced timeout for stability
      setTimeout(resolve, 3000);
    });
    
    // Wait for fonts and styles to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const iframeBody = iframe.contentDocument?.body;
    if (!iframeBody) {
      throw new Error('无法访问iframe内容');
    }
    
    // Brief wait for final rendering
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Find all pages in the HTML with precise selectors - only actual page elements
    const pages = iframeBody.querySelectorAll('.page:not(#pages-container):not(.page-indicator):not([id="page-indicator"])');
    console.log(`发现 ${pages.length} 个页面元素`);
    
    // Log all found page elements for debugging
    pages.forEach((page, index) => {
      const element = page as HTMLElement;
      console.log(`页面 ${index + 1}: id="${element.id}", class="${element.className}", 内容长度: ${element.textContent?.trim().length || 0}, 高度: ${element.offsetHeight}`);
    });
    
    // Filter out empty or invalid page elements and navigation elements
    const validPages = Array.from(pages).filter((page: Element) => {
      const element = page as HTMLElement;
      
      // Skip navigation, indicator elements, and containers
      if (element.id === 'page-indicator' || 
          element.id === 'pages-container' ||
          element.id === 'page-container' ||
          element.classList.contains('page-indicator') ||
          element.classList.contains('navigation') ||
          element.classList.contains('nav') ||
          element.classList.contains('controls') ||
          element.classList.contains('canvas-container') ||
          element.tagName.toLowerCase() === 'nav' ||
          element.tagName.toLowerCase() === 'button') {
        console.log(`跳过导航元素: ${element.id || element.className}`);
        return false;
      }
      
      // Only process elements that are actually page content (have specific page IDs)
      if (!element.id || !element.id.match(/^page-?\d+$/)) {
        console.log(`跳过非页面元素: ${element.id || element.className}`);
        return false;
      }
      
      // More lenient content and visibility checks
      const hasContent = element.textContent && element.textContent.trim().length > 20; // Reduced from 50
      const hasChild = element.children.length > 0; // Reduced from 1
      const hasMinHeight = element.offsetHeight > 100; // Reduced from 200
      const hasMinWidth = element.offsetWidth > 100;
      
      // Force visibility for hidden pages (they might be hidden by default navigation)
      const originalDisplay = element.style.display;
      const originalVisibility = element.style.visibility;
      const originalOpacity = element.style.opacity;
      
      // Temporarily show the element to check its actual dimensions
      element.style.display = 'block';
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      
      const actualHeight = element.offsetHeight;
      const actualWidth = element.offsetWidth;
      const actualContent = element.textContent?.trim().length || 0;
      
      // Restore original visibility
      element.style.display = originalDisplay;
      element.style.visibility = originalVisibility;
      element.style.opacity = originalOpacity;
      
      const isValidPage = (hasContent || hasChild) && actualHeight > 100 && actualWidth > 100;
      
      console.log(`页面 ${element.id || element.className} - 内容: ${actualContent}字符, 子元素: ${element.children.length}, 尺寸: ${actualWidth}x${actualHeight}, 有效: ${isValidPage}`);
      
      return isValidPage;
    });
    
    console.log(`过滤后有效页面数量: ${validPages.length}`);
    
    // Array to store PNG data URLs for audit
    const pngDataUrls: string[] = [];
    
    if (validPages.length === 0) {
      console.log('未找到页面元素，尝试截取整个body');
      // If no specific pages found, capture the whole body
      
      // Calculate optimal dimensions for the body
      const dimensions = calculateOptimalDimensions(iframeBody);
      const background = detectBackground(iframeBody, defaultOptions);
      
      console.log(`优化尺寸: ${dimensions.width}x${dimensions.height}, 背景: ${background}`);
      
      const dataUrl = await htmlToImage.toPng(iframeBody, {
        width: dimensions.width,
        height: dimensions.height,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: background,
        // Add options to better handle content boundaries
        skipAutoScale: true,
        includeQueryParams: true,
      });
      
      pngDataUrls.push(dataUrl);
      
      // If additional content is provided, create ZIP even for single page
      if (additionalContent) {
        const zip = new JSZip();
        
        // Add PNG to ZIP
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        zip.file('infographic.png', blob);
        
        // Add additional content files
        const timestamp = createTimestamp();
        const safeFilename = createSafeFilename(additionalContent.userQuestion);
        
        // Add MD file with AI response (UTF-8 encoded)
        const mdContent = additionalContent.aiResponseContent;
        zip.file(`${safeFilename}_${timestamp}.md`, mdContent, {
          binary: false,
          // 明确指定UTF-8编码，避免乱码问题
        });
        
        // Add title.txt with selected Xiaohongshu title (UTF-8 encoded)
        zip.file('title.txt', additionalContent.xiaohongshuTitle, {
          binary: false,
          // 明确指定UTF-8编码，避免乱码问题
        });
        
        // Add body.txt with Xiaohongshu body content (UTF-8 encoded)
        zip.file('body.txt', additionalContent.xiaohongshuBody, {
          binary: false,
          // 明确指定UTF-8编码，避免乱码问题
        });
        
        console.log('已添加额外文件到ZIP包中');
        
        // Download ZIP
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `${safeFilename}_${timestamp}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        console.log('单页PNG+额外文件打包下载成功');
      } else {
        // Single page download without additional content
        const link = document.createElement('a');
        link.download = `infographic-${new Date().getTime()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('单页PNG生成成功');
      }
    } else {
      // Multiple pages - create ZIP
      const zip = new JSZip();
      
      for (let i = 0; i < validPages.length; i++) {
        const page = validPages[i] as HTMLElement;
        console.log(`正在截取第 ${i + 1} 页，共 ${validPages.length} 页...`);
        
        // Store original styles for all pages first
        const originalStyles = validPages.map((p) => {
          const element = p as HTMLElement;
          return {
            display: element.style.display,
            opacity: element.style.opacity,
            visibility: element.style.visibility,
            position: element.style.position,
            zIndex: element.style.zIndex,
          };
        });
        
        // Hide all pages first
        validPages.forEach((p) => {
          const element = p as HTMLElement;
          element.style.display = 'none';
          element.style.opacity = '0';
          element.style.visibility = 'hidden';
        });
        
        // Show only the current page and ensure proper positioning
        page.style.display = 'flex';
        page.style.opacity = '1';
        page.style.visibility = 'visible';
        page.style.position = 'absolute';
        page.style.top = '0px';
        page.style.left = '0px';
        page.style.width = '448px';
        page.style.height = '597px';
        page.style.zIndex = '1000';
        page.style.transform = 'none';
        page.style.margin = '0';
        page.style.padding = '32px';
        page.style.boxSizing = 'border-box';
        
        // Ensure proper flexbox alignment
        if (!page.style.flexDirection) {
          page.style.flexDirection = 'column';
        }
        
        // Fix absolute positioned children for better screenshot compatibility
        const absoluteElements = page.querySelectorAll('[style*="position: absolute"], .footer');
        absoluteElements.forEach((element: any) => {
          const el = element as HTMLElement;
          if (el.style.position === 'absolute' || el.classList.contains('footer')) {
            const originalPosition = el.style.position;
            const originalBottom = el.style.bottom;
            const originalTop = el.style.top;
            
            // Store original values for restoration
            el.setAttribute('data-original-position', originalPosition);
            el.setAttribute('data-original-bottom', originalBottom);
            el.setAttribute('data-original-top', originalTop);
            
            // Convert to static positioning for screenshots
            el.style.position = 'static';
            el.style.bottom = 'auto';
            el.style.top = 'auto';
            el.style.marginTop = '20px';
          }
        });
        
        // Wait for the visibility changes to take effect
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          // Use fixed dimensions for consistent screenshots
          const fixedWidth = 448;
          const fixedHeight = 597;
          const background = detectBackground(page, defaultOptions);
          
          console.log(`第 ${i + 1} 页尺寸: ${fixedWidth}x${fixedHeight}, 背景: ${background}`);
          
          // Force a re-render to ensure layout is correct
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const dataUrl = await htmlToImage.toPng(page, {
            width: fixedWidth,
            height: fixedHeight,
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
              position: 'absolute',
              top: '0px',
              left: '0px',
            },
            quality: 1.0,
            pixelRatio: 2,
            backgroundColor: background,
            cacheBust: true,
            skipAutoScale: true,
            // Add specific positioning options
            filter: (node) => {
              // Skip navigation elements that might interfere
              if (node.id === 'page-indicator' || 
                  node.className?.includes?.('nav-button') ||
                  node.tagName === 'BUTTON') {
                return false;
              }
              return true;
            },
          });
          
          pngDataUrls.push(dataUrl);
          
          // Convert data URL to blob
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          zip.file(`page-${i + 1}.png`, blob);
          console.log(`第 ${i + 1} 页截取成功 (${blob.size} bytes)`);
        } catch (pageError) {
          console.error(`第 ${i + 1} 页截取失败:`, pageError);
          callbacks.setPngError(`第 ${i + 1} 页截取失败: ${pageError instanceof Error ? pageError.message : '未知错误'}`);
        }
        
        // Restore original styles for all pages
        validPages.forEach((p, index) => {
          const element = p as HTMLElement;
          const originalStyle = originalStyles[index];
          element.style.display = originalStyle.display;
          element.style.opacity = originalStyle.opacity;
          element.style.visibility = originalStyle.visibility;
          element.style.position = originalStyle.position;
          element.style.zIndex = originalStyle.zIndex;
          
          // Restore absolute positioned children
          const absoluteElements = element.querySelectorAll('[data-original-position]');
          absoluteElements.forEach((el: any) => {
            const htmlEl = el as HTMLElement;
            const originalPosition = htmlEl.getAttribute('data-original-position');
            const originalBottom = htmlEl.getAttribute('data-original-bottom');
            const originalTop = htmlEl.getAttribute('data-original-top');
            
            if (originalPosition) htmlEl.style.position = originalPosition;
            if (originalBottom) htmlEl.style.bottom = originalBottom;
            if (originalTop) htmlEl.style.top = originalTop;
            htmlEl.style.marginTop = '';
            
            // Clean up data attributes
            htmlEl.removeAttribute('data-original-position');
            htmlEl.removeAttribute('data-original-bottom');
            htmlEl.removeAttribute('data-original-top');
          });
        });
        
        // Brief pause between pages
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Prepare filename components
      const timestamp = createTimestamp();
      const safeFilename = additionalContent 
        ? createSafeFilename(additionalContent.userQuestion)
        : 'infographic_pages';
      
      // Add additional content files to ZIP if provided
      if (additionalContent) {
        // Add MD file with AI response (UTF-8 encoded)
        const mdContent = additionalContent.aiResponseContent;
        zip.file(`${safeFilename}_${timestamp}.md`, mdContent, {
          binary: false,
          // 明确指定UTF-8编码，避免乱码问题
        });
        
        // Add title.txt with selected Xiaohongshu title (UTF-8 encoded)
        zip.file('title.txt', additionalContent.xiaohongshuTitle, {
          binary: false,
          // 明确指定UTF-8编码，避免乱码问题
        });
        
        // Add body.txt with Xiaohongshu body content (UTF-8 encoded)
        zip.file('body.txt', additionalContent.xiaohongshuBody, {
          binary: false,
          // 明确指定UTF-8编码，避免乱码问题
        });
        
        console.log('已添加额外文件到ZIP包中');
      }
      
      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${safeFilename}_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      console.log(`${validPages.length} 页PNG打包下载成功`);
    }
    
    // Store PNG data URLs for audit
    callbacks.setGeneratedPNGs(pngDataUrls);
    
    // Clean up
    document.body.removeChild(iframe);
    
  } catch (error) {
    console.error('Error generating PNG:', error);
    callbacks.setPngError('PNG生成失败: ' + (error instanceof Error ? error.message : '未知错误'));
    
    // Clean up on error
    const iframe = document.querySelector('iframe[style*="-9999px"]');
    if (iframe) {
      document.body.removeChild(iframe);
    }
  } finally {
    callbacks.setIsGeneratingPNG(false);
  }
};

// Core PNG audit and fix function
export const auditAndFixPNG = async (
  generatedHTML: string,
  generatedPNGs: string[],
  callbacks: PngAuditCallbacks
): Promise<void> => {
  if (!generatedHTML || generatedPNGs.length === 0) {
    alert('请先生成HTML代码和PNG图片');
    return;
  }

  callbacks.setIsAuditingPNG(true);
  callbacks.setAuditError(null);

  try {
    console.log('开始审计PNG图片...');
    
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      throw new Error('VITE_GEMINI_API_KEY is not set in environment variables');
    }

    const prompt = `你是一个设计质量和技术质控智能体，请全面分析以下生成的PNG图片和HTML代码。

检查任务：
1. 技术问题检查：
   - 检查PNG图片中的内容是否有溢出448px × 597px的画布边界
   - 识别文字、图标或其他元素是否被裁切或超出边界

2. 设计质量检查：
   - 颜色对比度：文字与背景的对比度是否足够（最低4.5:1）
   - 字体可读性：是否有字体颜色过淡（如#999, #ccc）的问题
   - 文字遮挡：是否有文字重叠或遮挡其他元素的问题
   - 视觉效果：设计是否乏味，缺少视觉吸引力
   - 图标具体性：是否使用了过于抽象的图标，应该使用具体的emoji或图标

3. 布局优化检查：
   - 间距是否合理（line-height应为1.4-1.6）
   - 字体大小是否足够（正文最小16px，标题最小20px）
   - 元素之间是否有足够的padding和margin

修复要求：
- 如果发现颜色对比度不足，调整为深色文字（#1a1a1a或更深）
- 如果发现字体遮挡，增加适当的间距和padding
- 如果发现设计乏味，添加彩色渐变背景和更丰富的视觉元素
- 如果发现图标抽象，替换为具体的emoji（🚀📱💡🎯📊🔧等）
- 调整字体大小、间距、边距
- 优化布局结构，确保内容适配画布
- 保持设计美观性的同时确保完整显示

请仔细分析图片，如果发现任何问题（技术或设计），请提供修复后的完整HTML代码。如果没有发现问题，请回复"无需修复"。

当前HTML代码：
${generatedHTML}

PNG图片数量：${generatedPNGs.length}张
画布尺寸：448px × 597px`;

    const ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    });
    
    const config = {
      thinkingConfig: {
        thinkingBudget: 0,
      },
      responseMimeType: 'text/plain',
    };
    
    const model = 'gemini-2.5-flash';
    
    // Prepare contents with text and images
    const parts: any[] = [
      { text: prompt } as any
    ];
    
    // Add PNG images as inline data
    for (let i = 0; i < generatedPNGs.length; i++) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: generatedPNGs[i].replace(/^data:image\/png;base64,/, '')
        }
      } as any);
    }
    
    const contents = [
      {
        role: 'user',
        parts: parts,
      },
    ];

    console.log('发送审计请求到GoogleGenAI...');
    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });
    
    let auditResult = '';
    for await (const chunk of response) {
      if (chunk.text) {
        auditResult += chunk.text;
      }
    }
    
    console.log('审计结果:', auditResult);
    
    if (auditResult.includes('无需修复') || auditResult.includes('No fixes needed')) {
      alert('✅ 审计完成：PNG图片无溢出问题，无需修复');
    } else {
      // Extract HTML from the response
      const htmlMatch = auditResult.match(/```html\s*([\s\S]*?)\s*```/) || 
                        auditResult.match(/(<!DOCTYPE html[\s\S]*<\/html>)/);
      
      if (htmlMatch) {
        const fixedHTML = htmlMatch[1];
        callbacks.setGeneratedHTML(fixedHTML);
        alert('🔧 审计完成：发现溢出问题，已自动修复HTML代码。请重新生成PNG查看效果。');
        console.log('HTML已更新，长度:', fixedHTML.length);
      } else {
        // If no HTML found, show the audit result
        alert('⚠️ 审计完成：' + auditResult.substring(0, 200) + '...');
      }
    }
    
  } catch (error) {
    console.error('Error auditing PNG:', error);
    callbacks.setAuditError('审计失败: ' + (error instanceof Error ? error.message : '未知错误'));
  } finally {
    callbacks.setIsAuditingPNG(false);
  }
}; 