import { metapromptPrompts } from './metaprompt';
import { programmingPrompts } from './programming';
import { philosophyToolsPrompts } from './philosophy-tools';
import { contentCreationPrompts } from './content-creation';
import { productivityPrompts } from './productivity';
import { educationPrompts } from './education';
import { businessAnalysisPrompts } from './business-analysis';
import { scanPrompts, scanCategories } from './autoLoader';

// 自动扫描并加载所有 prompts 和分类
const autoLoadedPrompts = scanPrompts(__dirname);
const autoLoadedCategories = scanCategories(__dirname);

// 合并自动加载的 prompts 和显式导入的 prompts
export const defaultPrompts = [
  ...autoLoadedPrompts,
  // 为了确保关键 prompts 一定存在，显式包含它们
  ...metapromptPrompts,
  ...programmingPrompts,
  ...philosophyToolsPrompts,
  ...contentCreationPrompts,
  ...productivityPrompts,
  ...educationPrompts,
  ...businessAnalysisPrompts,
] as const;

// 导出自动加载的分类
export const defaultCategories = autoLoadedCategories;