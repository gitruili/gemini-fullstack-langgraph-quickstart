import { GoogleGenAI } from '@google/genai';
import { BlueprintResult } from './blueprintGenerator';

// Validation and optimization result interface
export interface ValidationResult {
  originalXiaohongshu: {
    titles: string[];
    content: string;
  };
  optimizedXiaohongshu: {
    titles: string[];
    content: string;
  };
  originalFirstPage: string;
  optimizedFirstPage: string;
  blueprint: string; // Updated blueprint with optimized first page
}

// API call to validate and optimize content using GoogleGenAI
const callGeminiForValidation = async (blueprintResult: BlueprintResult): Promise<ValidationResult> => {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set in environment variables');
  }

  // Extract first page from blueprint
  const blueprintPages = blueprintResult.blueprint.split(/信息图 \d+ \/ \d+/);
  const firstPageContent = blueprintPages[1] || blueprintPages[0] || '';

  const validationPrompt = `你是一个专业的小红书内容审核和优化专家。请帮我优化以下内容，确保完全符合小红书平台规范，并提升内容吸引力。

## 当前小红书内容：
标题选项：
${blueprintResult.xiaohongshu.titles.map((title, i) => `${i + 1}. ${title}`).join('\n')}

正文内容：
${blueprintResult.xiaohongshu.content}

## 当前设计蓝图第一页：
${firstPageContent}

## 优化要求：

### 小红书内容优化（严格遵守平台规范）：
1. **禁止内容**：
   - 移除所有夸大收益、短期暴富、炫富式表述（如"月入X万""搞钱秘笈""暴富""财富自由"等）
   - 删除诱导互动词汇（"点赞""收藏""关注""转发""双击""留言"等硬性号召）
   - 去除任何站外导流信息（二维码、外链、联系方式、微信号等）
   - 避免绝对化承诺（"一定能""100%""保证"等）

2. **语调要求**：
   - 保持客观、中立、诚恳的语调
   - 以分享经验和方法论为主
   - 避免过度营销和夸张表述
   - 突出个人真实感受和实践心得

3. **必须添加免责声明**：
   - 在正文末尾加入"效果因人而异，仅供参考，请理性实践"类似表述
   - 强调非保证收益，鼓励理性对待

4. **内容质量提升**：
   - 增加实用价值和可操作性
   - 保持内容的趣味性和可读性
   - 确保标题吸引但不夸张（每个标题限制在20字以内）
   - 标签数量限制在10个以内（#标签格式）

### 设计蓝图第一页优化：
1. **视觉吸引力提升**：
   - 增强封面的视觉冲击力
   - 优化色彩搭配，使用更现代、更吸引人的配色
   - 增加更有吸引力的emoji图标组合
   - 优化布局，突出核心卖点

2. **标题优化**：
   - 让标题更具吸引力和点击欲望
   - 突出核心价值和收益点
   - 保持简洁但有力的表达

3. **布局优化**：
   - 确保布局简单但视觉震撼
   - 突出重点信息
   - 增强用户想要"点击查看详情"的欲望

请以JSON格式返回优化结果：

{
  "optimizedXiaohongshu": {
    "titles": [
      "优化后的标题1（20字以内，吸引但不夸张）",
      "优化后的标题2（20字以内，吸引但不夸张）",
      "优化后的标题3（20字以内，吸引但不夸张）"
    ],
    "content": "优化后的正文内容，完全符合平台规范，包含免责声明"
  },
  "optimizedFirstPage": "页面类型：封面页面\\n页面标题：优化后的更吸引人的标题\\n核心内容与视觉构思\\n\\n布局：优化后的布局描述\\n背景：优化后的背景描述\\n内容：优化后的内容描述\\n视觉元素：优化后的视觉元素描述\\n色彩：优化后的色彩描述"
}

注意事项：
1. 严格遵守小红书平台规范，不得包含任何违规内容
2. 保持内容的实用性和价值性
3. 优化后的第一页要显著提升视觉吸引力
4. 确保所有内容都是正面、积极、合规的
5. 免责声明必须自然融入，不显突兀
6. 标签数量严格限制在10个以内（#标签格式）`;

  try {
    const ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    });
    
    const config = {
      thinkingConfig: {
        thinkingBudget: -1,
      },
      responseMimeType: 'application/json',
      systemInstruction: [
        {
          text: `You are a professional Xiaohongshu content compliance and optimization expert. Your role is to ensure all content strictly follows platform guidelines while maximizing engagement potential.

Critical Requirements:
- STRICT COMPLIANCE: Remove all prohibited content (earnings claims, interaction baiting, external links)
- OBJECTIVE TONE: Maintain neutral, sincere, experience-sharing tone
- DISCLAIMER REQUIRED: Include natural disclaimer about varying results
- VISUAL ENHANCEMENT: Significantly improve first page appeal and click-through desire
- VALUE FOCUSED: Emphasize practical value and authentic insights

Generate compliant, engaging content that users want to interact with while following all platform rules.`,
        }
      ],
    };
    
    const model = 'gemini-2.5-pro';
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: validationPrompt,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });
    
    let fullResponse = '';
    for await (const chunk of response) {
      if (chunk.text) {
        fullResponse += chunk.text;
      }
    }
    
    return parseValidationResponse(fullResponse, blueprintResult, firstPageContent);
  } catch (error) {
    console.error('Error calling GoogleGenAI API for validation:', error);
    return generateFallbackValidation(blueprintResult, firstPageContent);
  }
};

// Parse the validation response
const parseValidationResponse = (response: string, originalBlueprint: BlueprintResult, originalFirstPage: string): ValidationResult => {
  console.log('=== Parsing Validation Response ===');
  console.log('Response length:', response.length);
  
  try {
    // Clean up the response
    let cleanedResponse = response.trim();
    
    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    console.log('Cleaned response preview:', cleanedResponse.substring(0, 300));
    
    // Parse JSON
    const jsonResult = JSON.parse(cleanedResponse);
    console.log('Successfully parsed validation JSON');
    
    // Validate JSON structure
    if (jsonResult.optimizedXiaohongshu && jsonResult.optimizedFirstPage) {
      // Update blueprint with optimized first page
      const blueprintPages = originalBlueprint.blueprint.split(/信息图 \d+ \/ \d+/);
      const restOfBlueprint = blueprintPages.slice(2).join('信息图 ' + (blueprintPages.length > 2 ? '2' : '1') + ' / ');
      
      // Count total pages to maintain correct numbering
      const totalPages = (originalBlueprint.blueprint.match(/信息图 \d+ \/ (\d+)/g) || [])[0]?.match(/\d+/g)?.[1] || '3';
      
      const updatedBlueprint = `信息图 1 / ${totalPages}\n${jsonResult.optimizedFirstPage}${restOfBlueprint ? '\n\n信息图 2 / ' + totalPages + restOfBlueprint : ''}`;
      
      // Apply hashtag limiting to the optimized content
      const optimizedContent = limitHashtags(jsonResult.optimizedXiaohongshu.content);
      
      return {
        originalXiaohongshu: originalBlueprint.xiaohongshu,
        optimizedXiaohongshu: {
          ...jsonResult.optimizedXiaohongshu,
          content: optimizedContent
        },
        originalFirstPage: originalFirstPage,
        optimizedFirstPage: jsonResult.optimizedFirstPage,
        blueprint: updatedBlueprint
      };
    } else {
      throw new Error('Invalid JSON structure in validation response');
    }
    
  } catch (error) {
    console.error('Failed to parse validation response:', error);
    return generateFallbackValidation(originalBlueprint, originalFirstPage);
  }
};

// Helper function to limit hashtags to maximum 10
const limitHashtags = (content: string): string => {
  // Find all hashtags in the content
  const hashtagRegex = /#[\u4e00-\u9fa5a-zA-Z0-9_]+/g;
  const hashtags = content.match(hashtagRegex) || [];
  
  if (hashtags.length <= 10) {
    return content; // No change needed
  }
  
  // If more than 10 hashtags, keep only the first 10
  const limitedHashtags = hashtags.slice(0, 10);
  
  // Replace all hashtags in content with only the first 10
  const contentWithoutHashtags = content.replace(hashtagRegex, '');
  return contentWithoutHashtags.trim() + '\n' + limitedHashtags.join(' ');
};

// Generate fallback validation result
const generateFallbackValidation = (originalBlueprint: BlueprintResult, originalFirstPage: string): ValidationResult => {
  console.log('Generating fallback validation result');
  
  // Create compliant xiaohongshu content
  const optimizedTitles = originalBlueprint.xiaohongshu.titles.map(title => {
    // Remove prohibited terms and make more compliant
    return title
      .replace(/点赞|收藏|关注|转发|双击/g, '')
      .replace(/月入\d+万|暴富|搞钱|财富自由/g, '经验分享')
      .replace(/一定能|100%|保证/g, '可能')
      .trim()
      .substring(0, 20);
  });
  
  let optimizedContent = originalBlueprint.xiaohongshu.content
    .replace(/点赞|收藏|关注|转发|双击/g, '')
    .replace(/月入\d+万|暴富|搞钱|财富自由/g, '个人经验')
    .replace(/一定能|100%|保证/g, '可能会')
    + '\n\n💡 温馨提示：以上内容仅为个人经验分享，效果因人而异，请结合自身情况理性实践。';
  
  // Limit hashtags to maximum 10
  optimizedContent = limitHashtags(optimizedContent);
  
  // Create more attractive first page
  const optimizedFirstPage = `页面类型：封面页面
页面标题：💎 实用干货分享：值得收藏的经验总结
核心内容与视觉构思

布局：垂直居中布局，三层结构突出核心价值
背景：css(linear-gradient(135deg, #667eea 0%, #764ba2 100%))
内容：顶部吸引眼球的图标组合，中间醒目标题，底部价值描述
视觉元素：顶部✨💎🚀图标组合，中间白色大标题，底部金色副标题强调实用性
色彩：白色主标题(#ffffff)，金色强调文字(#ffd700)，深蓝紫渐变背景`;
  
  // Update blueprint
  const blueprintPages = originalBlueprint.blueprint.split(/信息图 \d+ \/ \d+/);
  const restOfBlueprint = blueprintPages.slice(2).join('信息图 2 / ');
  const totalPages = (originalBlueprint.blueprint.match(/信息图 \d+ \/ (\d+)/g) || [])[0]?.match(/\d+/g)?.[1] || '3';
  const updatedBlueprint = `信息图 1 / ${totalPages}\n${optimizedFirstPage}${restOfBlueprint ? '\n\n信息图 2 / ' + totalPages + restOfBlueprint : ''}`;
  
  return {
    originalXiaohongshu: originalBlueprint.xiaohongshu,
    optimizedXiaohongshu: {
      titles: optimizedTitles,
      content: optimizedContent
    },
    originalFirstPage: originalFirstPage,
    optimizedFirstPage: optimizedFirstPage,
    blueprint: updatedBlueprint
  };
};

// Main validation and optimization function
export const validateAndOptimizeContent = async (blueprintResult: BlueprintResult): Promise<ValidationResult> => {
  try {
    console.log('Starting content validation and optimization...');
    return await callGeminiForValidation(blueprintResult);
  } catch (error) {
    console.error('Content validation failed:', error);
    const firstPageContent = blueprintResult.blueprint.split(/信息图 \d+ \/ \d+/)[1] || '';
    return generateFallbackValidation(blueprintResult, firstPageContent);
  }
};

// Function to get optimized blueprint result for downstream processing
export const getOptimizedBlueprintResult = (validationResult: ValidationResult): BlueprintResult => {
  return {
    blueprint: validationResult.blueprint,
    xiaohongshu: validationResult.optimizedXiaohongshu
  };
}; 