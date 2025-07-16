import React, { useState } from 'react';
import { ValidationResult } from '../lib/contentValidator';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface ValidationComparisonProps {
  validationResult: ValidationResult;
  onContinue: () => void;
}

export const ValidationComparison: React.FC<ValidationComparisonProps> = ({
  validationResult,
  onContinue
}) => {
  const [selectedTab, setSelectedTab] = useState<'xiaohongshu' | 'firstpage'>('xiaohongshu');

  const formatText = (text: string) => {
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const ComparisonCard: React.FC<{
    title: string;
    before: React.ReactNode;
    after: React.ReactNode;
  }> = ({ title, before, after }) => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="mb-3">
            <span className="inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
              优化前 (Before)
            </span>
          </div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {before}
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3">
            <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
              优化后 (After)
            </span>
          </div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {after}
          </div>
        </Card>
      </div>
    </div>
  );

  const XiaohongshuComparison = () => (
    <div className="space-y-6">
      <ComparisonCard
        title="标题对比"
        before={
          <div className="space-y-2">
            {validationResult.originalXiaohongshu.titles.map((title, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded">
                {title}
              </div>
            ))}
          </div>
        }
        after={
          <div className="space-y-2">
            {validationResult.optimizedXiaohongshu.titles.map((title, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded">
                {title}
              </div>
            ))}
          </div>
        }
      />
      
      <ComparisonCard
        title="正文内容对比"
        before={formatText(validationResult.originalXiaohongshu.content)}
        after={formatText(validationResult.optimizedXiaohongshu.content)}
      />
    </div>
  );

  const FirstPageComparison = () => (
    <div className="space-y-6">
      <ComparisonCard
        title="封面页面设计对比"
        before={formatText(validationResult.originalFirstPage)}
        after={formatText(validationResult.optimizedFirstPage)}
      />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">内容优化与合规检查</h2>
        <p className="text-gray-600">
          AI 已自动优化内容以符合小红书平台规范，并提升封面吸引力
        </p>
      </div>

      <Card className="p-6">
        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'xiaohongshu' | 'firstpage')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="xiaohongshu">
              📱 小红书内容优化
            </TabsTrigger>
            <TabsTrigger value="firstpage">
              🎨 封面设计优化
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="xiaohongshu" className="mt-6">
            <XiaohongshuComparison />
          </TabsContent>
          
          <TabsContent value="firstpage" className="mt-6">
            <FirstPageComparison />
          </TabsContent>
        </Tabs>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <span className="text-blue-500 text-xl">ℹ️</span>
          <div className="text-sm text-blue-800">
            <h4 className="font-medium mb-1">优化说明</h4>
            <ul className="space-y-1 text-xs">
              <li>• 已移除可能违规的表述（夸大收益、诱导互动等）</li>
              <li>• 调整为客观、中性的分享语调</li>
              <li>• 添加必要的免责声明</li>
              <li>• 优化封面设计以提升点击吸引力</li>
              <li>• 确保内容符合小红书平台规范</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Button 
          onClick={onContinue}
          className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          确认使用优化后内容 →
        </Button>
      </div>
    </div>
  );
}; 