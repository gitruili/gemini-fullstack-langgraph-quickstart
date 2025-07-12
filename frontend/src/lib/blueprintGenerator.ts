import { GoogleGenAI } from '@google/genai';

// Blueprint generation interface
export interface BlueprintResult {
  blueprint: string;
  xiaohongshu: {
    titles: string[];
    content: string;
  };
}

// API call to generate blueprint using GoogleGenAI
const callGeminiAPI = async (content: string): Promise<BlueprintResult> => {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set in environment variables');
  }

  const prompt = `你是一个专业的信息图表设计师和小红书内容创作者。请根据以下内容生成详细的设计蓝图和小红书发布内容。

内容：
${content}

请按照以下格式生成多页信息图表的设计蓝图：

信息图 1 / [总页数]
页面类型：[封面页面/概览/对比/数据展示/内容详情/流程步骤]
页面标题：[具体标题]
核心内容与视觉构思

布局：[具体布局描述]
背景：[背景色彩和样式]
内容：[具体内容安排]
视觉元素：[图标、图表、动效等]
色彩：[色彩搭配方案]

要求：
1. 生成3-9页的完整设计蓝图
2. 第1页必须是封面页面（Hero Page）
3. 第2页必须是概览页面（Executive Summary）
4. 根据内容特点选择合适的页面类型（对比、数据展示、流程步骤等）
5. 每页都要有具体的布局、色彩、视觉元素描述
6. 适合448×597px的固定画布尺寸
7. 使用emoji图标和CSS渐变背景
8. 页面间要有逻辑连贯性

请根据内容的实际特点和信息量来确定页面数量和类型。

请以JSON格式返回结果：

{
  "blueprint": "信息图 1 / 3\\n页面类型：封面页面\\n页面标题：XXX\\n核心内容与视觉构思\\n\\n布局：XXX\\n背景：XXX\\n内容：XXX\\n视觉元素：XXX\\n色彩：XXX\\n\\n信息图 2 / 3\\n页面类型：概览\\n页面标题：XXX\\n核心内容与视觉构思\\n\\n布局：XXX\\n背景：XXX\\n内容：XXX\\n视觉元素：XXX\\n色彩：XXX\\n\\n信息图 3 / 3\\n页面类型：详情\\n页面标题：XXX\\n核心内容与视觉构思\\n\\n布局：XXX\\n背景：XXX\\n内容：XXX\\n视觉元素：XXX\\n色彩：XXX",
  "xiaohongshu": {
    "titles": [
      "标题1：[吸引人的标题，带相关emoji]",
      "标题2：[另一个角度的标题，带相关emoji]", 
      "标题3：[第三个备选标题，带相关emoji]"
    ],
    "content": "[引人入胜的开头]\n\n[核心内容要点，用emoji和换行符格式化]\n\n[实用建议或总结]\n\n[相关话题标签]\n#标签1 #标签2 #标签3 #标签4 #标签5 #标签6 #标签7 #标签8 #标签9"
  }
}

注意：
1. 返回严格的JSON格式，不要包含任何其他文字
2. blueprint字段必须是完整的多行字符串，包含所有页面信息，使用\\n表示换行
3. blueprint字段不要使用数组格式，必须是单个字符串
4. xiaohongshu.titles包含3个备选标题
5. xiaohongshu.content包含完整的正文内容，包括hashtags
6. 小红书内容要求简洁有趣，符合平台调性，标题吸引点击，正文有价值且易读，标签要热门且相关。`;

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
          text: `You are a professional infographic designer and Xiaohongshu content creator. You must respond in valid JSON format only. Do not include any explanation or additional text outside of the JSON structure. Return exactly the format requested in the prompt.`,
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
    
    // Parse the response to separate blueprint and Xiaohongshu content
    return parseBlueprintResponse(fullResponse);
  } catch (error) {
    console.error('Error calling GoogleGenAI API:', error);
    // Fallback to a basic blueprint if API fails
    return generateFallbackBlueprint(content);
  }
};

// Parse the API response to separate blueprint and Xiaohongshu content
const parseBlueprintResponse = (response: string): BlueprintResult => {
  console.log('=== Parsing Response ===');
  console.log('Full response length:', response.length);
  console.log('Response preview:', response.substring(0, 500));
  
  try {
    // Try to parse as JSON first
    console.log('Attempting to parse as JSON...');
    
    // Clean up the response - remove any markdown code blocks
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
    console.log('Successfully parsed JSON:', jsonResult);
    
    // Validate JSON structure
    if (jsonResult.blueprint && jsonResult.xiaohongshu) {
      console.log('Valid JSON structure found');
      
      // Convert blueprint to string if it's an array of objects
      let blueprintString = '';
      if (Array.isArray(jsonResult.blueprint)) {
        console.log('Blueprint is an array, converting to string...');
        console.log('Array length:', jsonResult.blueprint.length);
        console.log('First array item:', JSON.stringify(jsonResult.blueprint[0], null, 2));
        
        blueprintString = jsonResult.blueprint.map((page: any, index: number) => {
          // Log the page object to debug
          console.log(`Processing page ${index + 1}:`, JSON.stringify(page, null, 2));
          
          // Try multiple possible property names
          const pageType = page.page_type || page.pageType || page.type || page['页面类型'] || '未指定';
          const pageTitle = page.page_title || page.pageTitle || page.title || page['页面标题'] || '未指定';
          const layout = page.layout || page['布局'] || '未指定';
          const background = page.background || page['背景'] || '未指定';
          const content = page.content || page['内容'] || '未指定';
          const visualElements = page.visual_elements || page.visualElements || page['视觉元素'] || '未指定';
          const colors = page.colors || page.color || page['色彩'] || '未指定';
          
          return `信息图 ${index + 1} / ${jsonResult.blueprint.length}
页面类型：${pageType}
页面标题：${pageTitle}
核心内容与视觉构思

布局：${layout}
背景：${background}
内容：${content}
视觉元素：${visualElements}
色彩：${colors}`;
        }).join('\n\n');
      } else if (typeof jsonResult.blueprint === 'string') {
        blueprintString = jsonResult.blueprint;
      } else {
        console.log('Blueprint is neither array nor string, converting to string');
        console.log('Blueprint type:', typeof jsonResult.blueprint);
        console.log('Blueprint content:', JSON.stringify(jsonResult.blueprint, null, 2));
        blueprintString = JSON.stringify(jsonResult.blueprint, null, 2);
      }
      
      return {
        blueprint: blueprintString,
        xiaohongshu: {
          titles: jsonResult.xiaohongshu.titles || [],
          content: jsonResult.xiaohongshu.content || ''
        }
      };
    } else {
      console.log('Invalid JSON structure, missing required fields');
      throw new Error('Invalid JSON structure');
    }
    
  } catch (error) {
    console.log('JSON parsing failed:', error);
    console.log('Falling back to regex parsing...');
    
    // Fallback to regex parsing for non-JSON responses
    const parts = response.split('---');
    
    if (parts.length < 2) {
      console.log('No separator found, using entire response as blueprint');
      return {
        blueprint: response,
        xiaohongshu: {
          titles: [],
          content: ''
        }
      };
    }
    
    let blueprintPart = parts[0].trim();
    let xiaohongshoPart = parts.slice(1).join('---').trim();
    
    // Check if the blueprint part seems incomplete
    if (blueprintPart.length < 200 || !blueprintPart.includes('信息图')) {
      console.log('Blueprint part seems incomplete, checking for better split');
      
      const xiaohongshuStart = response.search(/小红书发布内容|【小红书标题】|Part 2.*小红书/i);
      if (xiaohongshuStart !== -1) {
        blueprintPart = response.substring(0, xiaohongshuStart).trim();
        xiaohongshoPart = response.substring(xiaohongshuStart).trim();
        console.log('Found better split at position:', xiaohongshuStart);
      }
    }
    
    // Extract titles with regex fallback
    const titlePatterns = [
      /标题\d+[：:]\s*(.*?)(?=\n|标题\d+[：:]|【小红书正文】|$)/g,
      /\*\s*\*\*标题\d+[：:]\*\*\s*(.*?)(?=\n|\*\s*\*\*标题\d+[：:]|【小红书正文】|$)/g,
      /•\s*标题\d+[：:]\s*(.*?)(?=\n|•\s*标题\d+[：:]|【小红书正文】|$)/g
    ];
    
    let titles: string[] = [];
    for (const pattern of titlePatterns) {
      const matches = Array.from(xiaohongshoPart.matchAll(pattern));
      if (matches.length > 0) {
        titles = matches.map(match => match[1].trim());
        console.log('Found titles with pattern:', pattern, titles);
        break;
      }
    }
    
    // Extract content with regex fallback
    const contentPatterns = [
      /【小红书正文】[：:]\s*([\s\S]*?)(?=\n\n|$)/,
      /小红书正文[：:]\s*([\s\S]*?)(?=\n\n|$)/,
      /正文[：:]\s*([\s\S]*?)(?=\n\n|$)/,
      /【小红书正文】[：:]\s*([\s\S]*)/,
      /小红书正文[：:]\s*([\s\S]*)/,
      /正文[：:]\s*([\s\S]*)/
    ];
    
    let content = '';
    for (const pattern of contentPatterns) {
      const match = xiaohongshoPart.match(pattern);
      if (match) {
        content = match[1].trim();
        console.log('Found content with pattern:', pattern);
        break;
      }
    }
    
    console.log('Regex fallback result:');
    console.log('- Blueprint length:', blueprintPart.length);
    console.log('- Titles count:', titles.length);
    console.log('- Content length:', content.length);
    
    return {
      blueprint: blueprintPart,
      xiaohongshu: {
        titles,
        content
      }
    };
  }
};

// Fallback blueprint generator
const generateFallbackBlueprint = (content: string): BlueprintResult => {
  const firstSentence = content.split('.')[0] || 'AI 数据分析';
  
  const blueprintContent = `信息图 1 / 3
页面类型：封面页面（Hero Page）
页面标题：${firstSentence.slice(0, 30)}
核心内容与视觉构思

布局：垂直居中全屏展示
背景：渐变色 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500
内容：主标题 + 副标题
视觉元素：🔍 📊 组合图标
色彩：白色文字，渐变背景

信息图 2 / 3
页面类型：概览（Executive Summary）
页面标题：核心要点总览
核心内容与视觉构思

布局：左右对分布局
背景：bg-slate-50
内容：关键洞察与分析要点
视觉元素：概念图谱展示
色彩：text-indigo-600 主色调

信息图 3 / 3
页面类型：内容详情
页面标题：详细分析
核心内容与视觉构思

布局：标准内容布局
背景：bg-white
内容：核心概念和实际应用
视觉元素：相关图标和图表
色彩：重点内容 bg-yellow-50 突出`;

  const xiaohongshuContent = `今天给大家分享一个超实用的内容！✨

📋 核心要点：
• 内容清晰易懂
• 实用性强
• 适合收藏学习

💡 建议大家：
收藏起来慢慢看，对你一定有帮助！

#干货分享 #学习笔记 #实用技巧 #知识分享 #效率提升 #生活技能 #经验总结 #必看推荐 #涨知识`;

  const xiaohongshuTitles = [
    `🚀 ${firstSentence.slice(0, 20)}...超详细解析！`,
    `📊 一看就懂的${firstSentence.slice(0, 15)}攻略`,
    `💡 ${firstSentence.slice(0, 18)}干货分享`
  ];

  return {
    blueprint: blueprintContent,
    xiaohongshu: {
      titles: xiaohongshuTitles,
      content: xiaohongshuContent
    }
  };
};

// Main blueprint generation function
export const generateBlueprint = async (content: string): Promise<BlueprintResult> => {
  try {
    return await callGeminiAPI(content);
  } catch (error) {
    console.error('Blueprint generation failed:', error);
    return generateFallbackBlueprint(content);
  }
}; 