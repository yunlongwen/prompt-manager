/**
 * Prompt Manager 常量定义
 */

/** 插件命令常量 */
export const COMMANDS = {
  SHOW_PROMPTS: "prompt-manager.showPrompts",
  ADD_PROMPT: "prompt-manager.addPrompt",
  MANAGE_PROMPTS: "prompt-manager.managePrompts",
  EXPORT_PROMPTS: "prompt-manager.exportPrompts",
  IMPORT_PROMPTS: "prompt-manager.importPrompts",
  // TreeView相关命令
  REFRESH_TREE: "prompt-manager.refreshTree",
  ADD_PROMPT_FROM_TREE: "prompt-manager.addPromptFromTree",
  EDIT_PROMPT_FROM_TREE: "prompt-manager.editPromptFromTree",
  DELETE_PROMPT_FROM_TREE: "prompt-manager.deletePromptFromTree",
  COPY_PROMPT_FROM_TREE: "prompt-manager.copyPromptFromTree",
  // 搜索相关命令
  SEARCH_PROMPTS: "prompt-manager.searchPrompts",
  CLEAR_SEARCH: "prompt-manager.clearSearch",
  // 分类操作相关命令
  EDIT_CATEGORY_FROM_TREE: "prompt-manager.editCategoryFromTree",
  ADD_PROMPT_TO_CATEGORY_FROM_TREE: "prompt-manager.addPromptToCategoryFromTree",
  EXPORT_CATEGORY_FROM_TREE: "prompt-manager.exportCategoryFromTree",
  DELETE_CATEGORY_FROM_TREE: "prompt-manager.deleteCategoryFromTree",
  // 空白区域右键菜单命令
  ADD_CATEGORY_FROM_TREE: "prompt-manager.addCategoryFromTree",
  // Chat集成相关命令
  SEND_TO_CHAT: "prompt-manager.sendToChat",
  SEND_TO_CHAT_FROM_TREE: "prompt-manager.sendToChatFromTree",
  // 设置相关命令
  OPEN_SETTINGS: "prompt-manager.openSettings",
  // 数据管理相关命令
  REINITIALIZE_DEFAULT_DATA: "prompt-manager.reinitializeDefaultData",
  // 说明书相关命令
  VIEW_GUIDE_FROM_TREE: "prompt-manager.viewGuideFromTree",
  EDIT_GUIDE_FROM_TREE: "prompt-manager.editGuideFromTree",
  // 未分类提示词彻底删除命令
  DELETE_UNCATEGORIZED_PROMPT_FROM_TREE: "prompt-manager.deleteUncategorizedPromptFromTree",
  // 同步相关命令
  PULL_FROM_REMOTE: "prompt-manager.pullFromRemote",
  PUSH_TO_REMOTE: "prompt-manager.pushToRemote",
  // Git相关命令
  GIT_PUSH: "prompt-manager.gitPush",
  GIT_PULL: "prompt-manager.gitPull",
} as const;

/** 存储键常量 */
export const STORAGE_KEYS = {
  PROMPTS: "prompt-manager.prompts",
  CATEGORIES: "prompt-manager.categories",
  SETTINGS: "prompt-manager.settings",
} as const;

/** 默认分类 */
export const DEFAULT_CATEGORIES = {
  METAPROMPT: {
    id: "metaprompt",
    name: "元提示词",
    description: "元提示词相关Prompt",
    icon: "lightbulb",
    sortOrder: 0,
  },
  PROGRAMMING: {
    id: "programming",
    name: "编程",
    description: "编程相关Prompt",
    icon: "code",
    sortOrder: 1,
  },
  PHILOSOPHY_TOOLS: {
    id: "philosophy-tools",
    name: "哲学工具箱",
    description: "哲学工具箱相关Prompt",
    icon: "search",
    sortOrder: 2,
  },
  CONTENT_CREATION: {
    id: "content-creation",
    name: "内容创作",
    description: "内容创作相关Prompt",
    icon: "book",
    sortOrder: 3,
  },
  PRODUCTIVITY: {
    id: "productivity",
    name: "生产力",
    description: "生产力相关Prompt",
    icon: "tools",
    sortOrder: 4,
  },
  EDUCATION: {
    id: "education",
    name: "学习教育",
    description: "学习教育相关Prompt",
    icon: "mortar-board",
    sortOrder: 5,
  },
  BUSINESS_ANALYSIS: {
    id: "business-analysis",
    name: "商业分析",
    description: "商业分析相关Prompt",
    icon: "briefcase",
    sortOrder: 6,
  },
} as const;

import { defaultPrompts, defaultCategories } from './prompts';

/** 默认示例Prompt */
export const DEFAULT_PROMPTS = defaultPrompts;

/** UI 相关常量 */
export const UI_CONSTANTS = {
  QUICK_PICK: {
    PLACEHOLDER: "搜索并选择Prompt模板...",
    NO_ITEMS_LABEL: "没有找到匹配的Prompt",
    LOADING_LABEL: "正在加载...",
  },
  INPUT_BOX: {
    TITLE_PLACEHOLDER: "输入Prompt标题",
    CONTENT_PLACEHOLDER: "输入Prompt内容",

    TAGS_PLACEHOLDER: "输入标签，用逗号分隔（可选）",
  },
  MESSAGES: {
    COPY_SUCCESS: "Prompt已复制到剪贴板",
    SAVE_SUCCESS: "Prompt保存成功",
    DELETE_SUCCESS: "Prompt删除成功",
    EXPORT_SUCCESS: "导出成功",
    IMPORT_SUCCESS: "导入成功",
    OPERATION_CANCELLED: "操作已取消",
    CONFIRM_DELETE: "确定要删除这个Prompt吗？",
    CONFIRM_CLEAR_ALL: "确定要清空所有数据吗？此操作不可恢复！",
  },
  ERRORS: {
    GENERIC: "操作失败，请重试",
    INVALID_INPUT: "输入无效",
    FILE_NOT_FOUND: "文件未找到",
    INVALID_FILE_FORMAT: "文件格式无效",
    SAVE_FAILED: "保存失败",
    LOAD_FAILED: "加载失败",
    EXPORT_FAILED: "导出失败",
    IMPORT_FAILED: "导入失败",
    CLIPBOARD_FAILED: "剪贴板操作失败",
  },
} as const;

/** 文件相关常量 */
export const FILE_CONSTANTS = {
  EXPORT_EXTENSION: ".json",
  EXPORT_FILTER: {
    JSON文件: ["json"], // 这个会在使用时动态本地化
  },
  DEFAULT_EXPORT_NAME: "prompt-manager-export",
  SUPPORTED_VERSIONS: ["1.0.0"],
  CURRENT_VERSION: "1.0.0",
} as const;

/**
 * 获取本地化的文件过滤器
 * @param t 本地化函数
 * @returns 本地化的文件过滤器
 */
export function getLocalizedFileFilter(t: (key: string) => string) {
  return {
    [t("file.jsonFiles")]: ["json"],
  };
}

/** 性能相关常量 */
export const PERFORMANCE_CONSTANTS = {
  /** 搜索防抖延迟（毫秒） */
  SEARCH_DEBOUNCE_DELAY: 300,
  /** 最大显示项目数 */
  MAX_QUICK_PICK_ITEMS: 100,
  /** 批量操作的分页大小 */
  BATCH_SIZE: 50,
} as const;

/** TreeView相关常量 */
export const TREE_VIEW = {
  /** 视图容器ID（自定义 Activity Bar 容器） */
  CONTAINER_ID: "prompt-manager",
  /** TreeView视图ID */
  VIEW_ID: "prompt-manager.promptTree",
  /** 视图名称 */
  VIEW_NAME: "Prompts",
} as const;

/** TreeView上下文值常量 */
export const TREE_CONTEXT_VALUES = {
  /** Prompt项目 */
  PROMPT_ITEM: "promptItem",
  /** 分类项目 */
  CATEGORY_ITEM: "categoryItem",
  /** 说明书项目 */
  GUIDE_ITEM: "guideItem",
} as const;

/** TreeView图标常量 */
export const TREE_ICONS = {
  /** 分类图标 */
  CATEGORY: "folder",
  /** Prompt项目图标 */
  PROMPT: "file",
  /** 刷新图标 */
  REFRESH: "refresh",
  /** 添加图标 */
  ADD: "add",
  /** 编辑图标 */
  EDIT: "edit",
  /** 删除图标 */
  DELETE: "trash",
  /** 复制图标 */
  COPY: "copy",
} as const;

/** TreeView特殊分类ID */
export const TREE_SPECIAL_CATEGORIES = {
  /** 未分类ID */
  UNCATEGORIZED: "__uncategorized__",
} as const;

/**
 * 获取本地化的默认分类
 * @param t 本地化函数
 * @returns 本地化的默认分类
 */
export function getLocalizedDefaultCategories(t: (key: string) => string) {
  // 获取自动加载的分类
  const autoLoadedCategoriesMap: Record<string, any> = {};
  
  // 将自动加载的分类转换为本地化版本
  defaultCategories.forEach(category => {
    autoLoadedCategoriesMap[category.id.toUpperCase()] = {
      ...category,
      name: t(`category.${category.id}`) || category.name,
      description: t(`category.${category.id}`) || category.description,
    };
  });

  // 如果没有自动加载的分类，则使用默认的硬编码分类作为后备
  if (defaultCategories.length === 0) {
    return {
      METAPROMPT: {
        id: "metaprompt",
        name: t("category.metaprompt"),
        description: t("category.metaprompt"),
        icon: "lightbulb",
        sortOrder: 0,
      },
      PROGRAMMING: {
        id: "programming",
        name: t("category.programming"),
        description: t("category.programming"),
        icon: "code",
        sortOrder: 1,
      },
      PHILOSOPHY_TOOLS: {
        id: "philosophy-tools",
        name: t("category.philosophy-tools"),
        description: t("category.philosophy-tools"),
        icon: "search",
        sortOrder: 2,
      },
      CONTENT_CREATION: {
        id: "content-creation",
        name: t("category.content-creation"),
        description: t("category.content-creation"),
        icon: "book",
        sortOrder: 3,
      },
      PRODUCTIVITY: {
        id: "productivity",
        name: t("category.productivity"),
        description: t("category.productivity"),
        icon: "tools",
        sortOrder: 4,
      },
      EDUCATION: {
        id: "education",
        name: t("category.education"),
        description: t("category.education"),
        icon: "mortar-board",
        sortOrder: 5,
      },
      BUSINESS_ANALYSIS: {
        id: "business-analysis",
        name: t("category.business-analysis"),
        description: t("category.business-analysis"),
        icon: "briefcase",
        sortOrder: 6,
      },
    };
  }

  return autoLoadedCategoriesMap;
}

/**
 * 获取自动加载的分类数组
 * @returns PromptCategory 数组
 */
export function getAutoLoadedCategories() {
  return defaultCategories;
}

/**
 * 获取本地化的默认提示
 * @param t 本地化函数
 * @returns 本地化的默认提示
 */
export function getLocalizedDefaultPrompts(t: (key: string) => string) {
  // 获取自动加载的 prompts 并去重（基于 id）
  const uniquePrompts = new Map();
  
  defaultPrompts.forEach(prompt => {
    if (!uniquePrompts.has(prompt.id)) {
      uniquePrompts.set(prompt.id, prompt);
    }
  });

  // 将去重后的 prompts 转换为本地化版本
  const localizedPrompts = Array.from(uniquePrompts.values()).map(prompt => ({
    ...prompt,
    title: t(`prompt.${prompt.id}.title`) || prompt.title,
    content: t(`prompt.${prompt.id}.content`) || prompt.content,
    tags: prompt.tags?.map((tag: string) => t(`tag.${tag}`) || tag) || [],
  }));

  // 返回本地化后的 prompts
  return localizedPrompts;
}
