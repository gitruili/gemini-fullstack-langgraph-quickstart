import { useState } from 'react';
import { generateBlueprint } from '@/lib/blueprintGenerator';
import { validateAndOptimizeContent, getOptimizedBlueprintResult } from '@/lib/contentValidator';
import { generateHTML } from '@/lib/htmlGenerator';
import { generatePNG, PngGenerationCallbacks, PngAdditionalContent } from '@/lib/pngGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText } from 'lucide-react';

interface DirectModeProcessorProps {
  content: string;
  onComplete?: () => void;
}

export function DirectModeProcessor({ content, onComplete }: DirectModeProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [generatedPNGs, setGeneratedPNGs] = useState<string[]>([]);
  const [isGeneratingPNG, setIsGeneratingPNG] = useState(false);
  const [pngError, setPngError] = useState<string | null>(null);

  const handleDirectProcessing = async () => {
    if (!content.trim()) {
      setError('请输入内容');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setCurrentStep('正在生成蓝图...');

    try {
      // Step 1: Generate blueprint from content
      console.log('Step 1: Generating blueprint from content...');
      const blueprintResult = await generateBlueprint(content);
      console.log('Blueprint generated:', blueprintResult);

      setCurrentStep('正在优化内容...');

      // Step 2: Validate and optimize content
      console.log('Step 2: Validating and optimizing content...');
      const validationResult = await validateAndOptimizeContent(blueprintResult);
      const optimizedBlueprintResult = getOptimizedBlueprintResult(validationResult);
      console.log('Content optimized:', optimizedBlueprintResult);

      setCurrentStep('正在生成HTML...');

      // Step 3: Generate HTML from optimized blueprint
      console.log('Step 3: Generating HTML from blueprint...');
      const generatedHTML = await generateHTML(optimizedBlueprintResult.blueprint);
      console.log('HTML generated, length:', generatedHTML.length);

      setCurrentStep('正在生成PNG...');

      // Step 4: Generate PNG from HTML
      console.log('Step 4: Generating PNG from HTML...');
      const pngCallbacks: PngGenerationCallbacks = {
        setIsGeneratingPNG,
        setPngError,
        setGeneratedPNGs,
      };

      const additionalContent: PngAdditionalContent = {
        aiResponseContent: optimizedBlueprintResult.xiaohongshu.content,
        xiaohongshuTitle: optimizedBlueprintResult.xiaohongshu.titles[0] || '内容总结',
        xiaohongshuBody: optimizedBlueprintResult.xiaohongshu.content,
        userQuestion: content,
      };

      await generatePNG(generatedHTML, pngCallbacks, additionalContent);
      console.log('PNG generation completed');

      setCurrentStep('完成！');

      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error in direct processing:', error);
      setError(error instanceof Error ? error.message : '处理过程中出现错误');
    } finally {
      setIsProcessing(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>直接模式处理</CardTitle>
          <CardDescription>
            基于您提供的文本直接生成信息图表和小红书内容
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">输入内容：</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {content.length > 200 ? `${content.substring(0, 200)}...` : content}
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {currentStep && (
            <div className="bg-primary/10 text-primary p-3 rounded-md text-sm">
              {currentStep}
            </div>
          )}

          <Button
            onClick={handleDirectProcessing}
            disabled={isProcessing || !content.trim()}
            className="w-full"
            variant="default"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                开始生成
              </>
            )}
          </Button>

          {isGeneratingPNG && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm">正在生成PNG...</span>
            </div>
          )}

          {pngError && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              生成PNG失败：{pngError}
            </div>
          )}

          {generatedPNGs.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">生成的图片：</h4>
              <p className="text-sm text-muted-foreground">
                已生成 {generatedPNGs.length} 张图片，ZIP文件已下载到您的设备。
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}