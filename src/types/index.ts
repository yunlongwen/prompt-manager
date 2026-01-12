/**
 * Prompt Manager 核心类型定义
 */

import * as vscode from "vscode";

// 导出Chat集成相关类型
export {
  IChatIntegrationService,
  ChatIntegrationOptions,
  ChatIntegrationStatus,
} from "../services/interfaces/IChatIntegrationService";

export {
  IEditorEnvironmentDetector,
  EditorEnvironmentType,
  EditorEnvironmentInfo,
} from "../services/interfaces/IEditorEnvironmentDetector";

/**
 * Prompt项目接口
 */
export interface PromptItem {
  /** 唯一标识符 */
  id: string;

  /** 标题 */
  title: string;

  /** Prompt内容 */
  content: string;

  /** 分类ID */
  categoryId?: string;

  /** 标签列表 */
  tags?: string[];
}

/**
 * Prompt分类接口
 */
export interface PromptCategory {
  /** 唯一标识符 */
  id: string;

  /** 分类名称 */
  name: string;

  /** 分类描述 */
  description?: string;

  /** 图标名称 */
  icon?: string;

  /** 排序权重 */
  sortOrder?: number;

  /** 创建时间 */
  createdAt?: Date;
}

/**
 * 快速选择项目接口
 */
export interface QuickPickPromptItem {
  /** 显示标签 */
  label: string;

  /** 详细描述 */
  description?: string;

  /** 详细信息 */
  detail?: string;

  /** 对应的Prompt项目 */
  promptItem: PromptItem;

  /** 是否被选中 */
  picked?: boolean;
}

/**
 * 导入导出数据结构
 */
export interface ExportData {
  /** 格式版本 */
  version: string;

  /** 导出时间 */
  exportedAt: Date;

  /** Prompt列表 */
  prompts: PromptItem[];

  /** 分类列表 */
  categories: PromptCategory[];

  /** 元数据 */
  metadata?: {
    totalCount: number;
    categoryCount: number;
    [key: string]: any;
  };
}

/**
 * 存储服务接口
 */
export interface IStorageService {
  /** 获取所有Prompt */
  getPrompts(): Promise<PromptItem[]>;

  /** 根据ID获取Prompt */
  getPrompt(id: string): Promise<PromptItem | undefined>;

  /** 保存Prompt */
  savePrompt(prompt: PromptItem): Promise<void>;

  /** 删除Prompt */
  deletePrompt(id: string): Promise<void>;

  /** 获取所有分类 */
  getCategories(): Promise<PromptCategory[]>;

  /** 保存分类 */
  saveCategory(category: PromptCategory): Promise<void>;

  /** 删除分类 */
  deleteCategory(id: string): Promise<void>;

  /** 清空所有数据 */
  clearAll(): Promise<void>;
}

/**
 * 用户界面服务接口
 */
export interface IUIService {
  /** 显示Prompt选择列表 */
  showPromptPicker(prompts: PromptItem[]): Promise<PromptItem | undefined>;

  /** 显示Prompt编辑界面 */
  showPromptEditor(
    prompt?: PromptItem,
    context?: vscode.ExtensionContext
  ): Promise<PromptItem | undefined>;

  /** 显示分类选择列表 */
  showCategoryPicker(categories: PromptCategory[]): Promise<PromptCategory | undefined>;

  /** 显示确认对话框 */
  showConfirmDialog(message: string): Promise<boolean>;

  /** 显示信息提示 */
  showInfo(message: string): Promise<void>;

  /** 显示错误提示 */
  showError(message: string): Promise<void>;

  /** 显示文件保存对话框 */
  showSaveDialog(defaultName?: string): Promise<string | undefined>;

  /** 显示文件打开对话框 */
  showOpenDialog(): Promise<string | undefined>;
}

/**
 * 剪贴板服务接口
 */
export interface IClipboardService {
  /** 复制文本到剪贴板 */
  copyText(text: string): Promise<void>;

  /** 从剪贴板读取文本 */
  readText(): Promise<string>;
}

/**
 * 导入导出服务接口
 */
export interface IImportExportService {
  /** 导出数据到文件 */
  exportToFile(data: ExportData, filePath: string): Promise<void>;

  /** 从文件导入数据 */
  importFromFile(filePath: string): Promise<ExportData>;

  /** 验证导入数据格式 */
  validateImportData(data: any): Promise<boolean>;
}

/**
 * 同步选项接口
 */
export interface SyncOptions {
  /** 强制覆盖本地数据 */
  force?: boolean;
  /** 覆盖本地数据 */
  overwriteLocal?: boolean;
}

/**
 * 同步结果接口
 */
export interface SyncResult {
  /** 是否成功 */
  success: boolean;
  /** 同步的数据统计 */
  data?: {
    promptsSynced: number;
    categoriesSynced: number;
    action: "pull" | "push" | "force_pull";
  };
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: string;
}

/**
 * 同步服务接口
 */
export interface ISyncService {
  /** 从远端拉取数据 */
  pull(options?: SyncOptions): Promise<SyncResult>;

  /** 推送数据到远端 */
  push(options?: SyncOptions): Promise<SyncResult>;

  /** 获取同步状态 */
  getSyncStatus(): Promise<{
    isConfigured: boolean;
    serverUrl: string;
    hasAuthToken: boolean;
    lastSyncTime?: Date;
  }>;
}

/**
 * Prompt管理器接口
 */
export interface IPromptManager {
  /** 初始化 */
  initialize(context: vscode.ExtensionContext): Promise<void>;

  /** 获取所有Prompt */
  getAllPrompts(): Promise<PromptItem[]>;

  /** 搜索Prompt */
  searchPrompts(query: string): Promise<PromptItem[]>;

  /** 根据分类获取Prompt */
  getPromptsByCategory(categoryId: string): Promise<PromptItem[]>;

  /** 创建新Prompt */
  createPrompt(prompt: Omit<PromptItem, "id">): Promise<PromptItem>;

  /** 更新Prompt */
  updatePrompt(prompt: PromptItem): Promise<void>;

  /** 删除Prompt */
  deletePrompt(id: string): Promise<void>;

  /** 导出所有数据 */
  exportData(): Promise<ExportData>;

  /** 导入数据 */
  importData(data: ExportData): Promise<void>;
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  /** 搜索关键词 */
  query: string;

  /** 分类过滤 */
  categoryId?: string;

  /** 标签过滤 */
  tags?: string[];

  /** 是否搜索内容 */
  includeContent?: boolean;

  /** 是否搜索描述 */
  includeDescription?: boolean;

  /** 是否搜索标签 */
  includeTags?: boolean;

  /** 排序方式 */
  sortBy?: "title";

  /** 排序方向 */
  sortDirection?: "asc" | "desc";
}

/**
 * 操作结果
 */
export interface OperationResult<T = any> {
  /** 是否成功 */
  success: boolean;

  /** 结果数据 */
  data?: T;

  /** 错误信息 */
  error?: string;

  /** 错误代码 */
  errorCode?: string;
}

/**
 * 统计信息接口
 */
export interface PromptStats {
  /** Prompt总数 */
  totalPrompts: number;

  /** 分类总数 */
  totalCategories: number;

  /** 热门分类 */
  topCategories: string[];
}

/**
 * TreeView项目接口
 */
export interface TreePromptItem {
  /** 唯一标识符 */
  id: string;

  /** 显示标签 */
  label: string;

  /** 上下文值，用于确定菜单项可见性 */
  contextValue: "promptItem" | "categoryItem" | "guideItem";

  /** 图标路径 */
  iconPath?: vscode.ThemeIcon;

  /** 折叠状态 */
  collapsibleState?: vscode.TreeItemCollapsibleState;

  /** 点击命令 */
  command?: vscode.Command;

  /** 关联的Prompt数据（仅对prompt项目有效） */
  promptData?: PromptItem;

  /** 关联的分类数据（仅对分类项目有效） */
  categoryData?: PromptCategory;

  /** 父级ID */
  parentId?: string;

  /** 排序权重 */
  sortOrder?: number;
}

/**
 * TreeView分类项目接口
 */
export interface TreeCategoryItem extends TreePromptItem {
  /** 描述信息（分类专用） */
  description?: string;
  contextValue: "categoryItem";
  categoryData: PromptCategory;
  children?: TreePromptItem[];
}

/**
 * TreeView Prompt项目接口
 */
export interface TreePromptItemData extends TreePromptItem {
  contextValue: "promptItem";
  promptData: PromptItem;
}

/**
 * TreeView 说明书项目接口
 */
export interface TreeGuideItem extends TreePromptItem {
  contextValue: "guideItem";
  guideData: PromptItem;
  categoryId: string;
}

/**
 * Prompt TreeDataProvider接口
 */
export interface IPromptTreeDataProvider extends vscode.TreeDataProvider<TreePromptItem> {
  /** 刷新TreeView */
  refresh(): void;

  /** 刷新特定项目 */
  refreshItem(item: TreePromptItem): void;

  /** 获取父级项目 */
  getParent(element: TreePromptItem): vscode.ProviderResult<TreePromptItem>;

  /** TreeView数据变化事件 */
  onDidChangeTreeData: vscode.Event<TreePromptItem | undefined | null | void>;
}

/**
 * TreeView操作上下文
 */
export interface TreeViewActionContext {
  /** 当前选中的TreeView项目 */
  selectedItem?: TreePromptItem;

  /** 相关的PromptManager实例 */
  promptManager: IPromptManager;

  /** VS Code扩展上下文 */
  extensionContext: vscode.ExtensionContext;
}

/**
 * Prompt操作类型枚举
 */
export enum PromptActionType {
  /** 复制到剪贴板 */
  COPY_TO_CLIPBOARD = "copy",

  /** 发送到Chat */
  SEND_TO_CHAT = "chat",

  /** 发送到Cursor Chat（向后兼容性，内部重定向到SEND_TO_CHAT） */
  SEND_TO_CURSOR_CHAT = "cursor",

  /** 智能使用（根据环境自动选择最佳方式） */
  INTELLIGENT_USE = "intelligent",

  /** 插入到编辑器 */
  INSERT_TO_EDITOR = "insert",

  /** 插入到编辑器并复制 */
  INSERT_AND_COPY = "insertAndCopy",

  /** 编辑 */
  EDIT = "edit",

  /** 删除 */
  DELETE = "delete",
}

/**
 * Prompt操作结果
 */
export interface PromptActionResult {
  /** 是否成功 */
  success: boolean;

  /** 成功执行的操作列表 */
  actions: string[];

  /** 错误信息列表 */
  errors: string[];

  /** 警告信息列表（可选） */
  warnings?: string[];
}

/**
 * Prompt操作策略接口
 */
export interface IPromptActionStrategy {
  /** 操作类型 */
  readonly actionType: PromptActionType;

  /** 检查策略是否可用 */
  isAvailable(): Promise<boolean>;

  /** 执行策略 */
  execute(prompt: PromptItem, options?: any): Promise<PromptActionResult>;

  /** 获取策略描述 */
  getDescription(): string;
}
