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
  
  // For card-like designs with borders/shadows, use transparent to preserve the card effect
  if (hasCardStyling && (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent')) {
    return 'transparent';
  }
  
  // For gradient backgrounds, use transparent to preserve the gradient
  if (hasGradient) {
    return 'transparent';
  }
  
  // For infographic content with solid backgrounds, use white for best compatibility
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

  // For infographic content, default to white background for better compatibility
  const defaultOptions: PngGenerationOptions = {
    forceWhiteBackground: true, // Default to white background for most content
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
      // Fallback timeout
      setTimeout(resolve, 3000);
    });
    
    // Additional wait for fonts and styles to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const iframeBody = iframe.contentDocument?.body;
    if (!iframeBody) {
      throw new Error('无法访问iframe内容');
    }
    
    // Find all pages in the HTML with more precise selectors
    const pages = iframeBody.querySelectorAll('[id^="page-"], [id="page1"], [id="page2"], [id="page3"], [id="page4"], [id="page5"], [id="page6"], [id="page7"], [id="page8"], [id="page9"], [id="page10"], .page, .infographic-page');
    console.log(`发现 ${pages.length} 个页面元素`);
    
    // Filter out empty or invalid page elements
    const validPages = Array.from(pages).filter((page: Element) => {
      const element = page as HTMLElement;
      // Check if element has meaningful content
      const hasContent = element.textContent && element.textContent.trim().length > 10;
      const hasChild = element.children.length > 0;
      const hasMinHeight = element.offsetHeight > 100;
      
      console.log(`页面 ${element.id || element.className} - 内容: ${hasContent}, 子元素: ${hasChild}, 高度: ${element.offsetHeight}`);
      
      return hasContent || hasChild || hasMinHeight;
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
        
        // Add MD file with AI response
        const mdContent = additionalContent.aiResponseContent;
        zip.file(`${safeFilename}_${timestamp}.md`, mdContent);
        
        // Add title.txt with selected Xiaohongshu title
        zip.file('title.txt', additionalContent.xiaohongshuTitle);
        
        // Add body.txt with Xiaohongshu body content
        zip.file('body.txt', additionalContent.xiaohongshuBody);
        
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
        console.log(`正在截取第 ${i + 1} 页...`);
        
        // Make sure only this page is visible
        validPages.forEach((p, index) => {
          const element = p as HTMLElement;
          if (index === i) {
            element.style.display = 'flex';
            element.style.opacity = '1';
            element.style.visibility = 'visible';
          } else {
            element.style.display = 'none';
            element.style.opacity = '0';
            element.style.visibility = 'hidden';
          }
        });
        
        // Wait a bit for the visibility changes to take effect
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          // Calculate optimal dimensions for this page
          const dimensions = calculateOptimalDimensions(page);
          const background = detectBackground(page, defaultOptions);
          
          console.log(`第 ${i + 1} 页优化尺寸: ${dimensions.width}x${dimensions.height}, 背景: ${background}`);
          
          const dataUrl = await htmlToImage.toPng(page, {
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
          
          // Convert data URL to blob
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          zip.file(`page-${i + 1}.png`, blob);
          console.log(`第 ${i + 1} 页截取成功`);
        } catch (pageError) {
          console.error(`第 ${i + 1} 页截取失败:`, pageError);
          callbacks.setPngError(`第 ${i + 1} 页截取失败: ${pageError instanceof Error ? pageError.message : '未知错误'}`);
        }
      }
      
      // Prepare filename components
      const timestamp = createTimestamp();
      const safeFilename = additionalContent 
        ? createSafeFilename(additionalContent.userQuestion)
        : 'infographic_pages';
      
      // Add additional content files to ZIP if provided
      if (additionalContent) {
        // Add MD file with AI response
        const mdContent = additionalContent.aiResponseContent;
        zip.file(`${safeFilename}_${timestamp}.md`, mdContent);
        
        // Add title.txt with selected Xiaohongshu title
        zip.file('title.txt', additionalContent.xiaohongshuTitle);
        
        // Add body.txt with Xiaohongshu body content
        zip.file('body.txt', additionalContent.xiaohongshuBody);
        
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