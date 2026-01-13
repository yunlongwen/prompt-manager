import * as vscode from "vscode";
import {
  IPromptManager,
  PromptItem,
  PromptCategory,
  ExportData,
  SearchOptions,
  PromptStats,
  PromptActionType,
  PromptActionResult,
} from "../types";
import { StorageService } from "../services/StorageService";
import { ClipboardService } from "../services/ClipboardService";
import { UIService } from "../services/UIService";
import { ImportExportService } from "../services/ImportExportService";
import { SyncService } from "../services/SyncService";
import { CursorIntegrationService } from "../services/CursorIntegrationService";
import { ChatIntegrationFactory } from "../services/ChatIntegrationFactory";
import { ChatIntegrationOptions, ChatIntegrationStatus, EditorEnvironmentType } from "../types";
import { DEFAULT_CATEGORIES, DEFAULT_PROMPTS } from "../constants/constants";
import { t } from "../services/LocalizationService";

/**
 * Prompt管理器 - 核心业务逻辑
 * 协调所有服务，提供完整的Prompt管理功能
 */
export class PromptManager implements IPromptManager {
  private static instance: PromptManager;

  private storageService!: StorageService;
  private clipboardService: ClipboardService;
  private uiService: UIService;
  private importExportService: ImportExportService;
  private syncService!: SyncService;
  private cursorIntegrationService: CursorIntegrationService;
  private chatIntegrationFactory: ChatIntegrationFactory;
  private context: vscode.ExtensionContext | null = null;

  private readonly _onDidPromptsChange = new vscode.EventEmitter<void>();
  public readonly onDidPromptsChange = this._onDidPromptsChange.event;

  /**
   * 获取单例实例
   */
  static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager();
    }
    return PromptManager.instance;
  }

  private constructor() {
    // 服务将在initialize中初始化
    this.clipboardService = ClipboardService.getInstance();
    this.uiService = UIService.getInstance();
    this.importExportService = ImportExportService.getInstance();
    this.cursorIntegrationService = CursorIntegrationService.getInstance();
    this.chatIntegrationFactory = ChatIntegrationFactory.getInstance();
  }

  /**
   * 初始化管理器
   * @param context VSCode扩展上下文
   */
  async initialize(context: vscode.ExtensionContext): Promise<void> {
    try {
      this.context = context;

      // 初始化存储服务
      this.storageService = new StorageService(context);
      await this.storageService.initialize();

      // 初始化同步服务
      this.syncService = SyncService.getInstance(this.storageService);

      // 检查是否是首次使用
      await this.ensureDefaultData();

      console.log("PromptManager 初始化完成");
    } catch (error) {
      console.error("PromptManager 初始化失败:", error);
      await this.uiService.showError(t("error.initializationFailed"));
      throw error;
    }
  }

  // Prompt 管理方法

  /**
   * 显示Prompt选择器
   */
  async showPromptPicker(): Promise<void> {
    try {
      const prompts = await this.storageService.getPrompts();

      if (prompts.length === 0) {
        await this.uiService.showInfo(t("error.noPrompts"));
        return;
      }

      const selectedPrompt = await this.uiService.showPromptPicker(prompts);

      if (selectedPrompt) {
        await this.handlePromptSelection(selectedPrompt);
      }
    } catch (error) {
      console.error("显示Prompt选择器失败:", error);
      await this.uiService.showError(t("error.showPromptsFailed"));
    }
  }

  /**
   * 添加新Prompt
   */
  async addPrompt(): Promise<void> {
    try {
      const newPrompt = await this.uiService.showPromptEditor(undefined, this.context || undefined);

      if (newPrompt) {
        await this.storageService.savePrompt(newPrompt);
        this._onDidPromptsChange.fire();
        await this.uiService.showInfo(t("message.promptAdded", newPrompt.title));
      }
    } catch (error) {
      console.error("添加Prompt失败:", error);
      await this.uiService.showError(t("error.addPromptFailed"));
    }
  }

  /**
   * 编辑Prompt
   * @param promptId Prompt ID
   */
  async editPrompt(promptId: string): Promise<void> {
    try {
      const prompt = await this.storageService.getPrompt(promptId);

      if (!prompt) {
        await this.uiService.showError(t("message.promptNotFound"));
        return;
      }

      const editedPrompt = await this.uiService.showPromptEditor(prompt, this.context || undefined);

      if (editedPrompt) {
        await this.storageService.savePrompt(editedPrompt);
        this._onDidPromptsChange.fire();
        await this.uiService.showInfo(t("message.promptUpdated", editedPrompt.title));
      }
    } catch (error) {
      console.error("编辑Prompt失败:", error);
      await this.uiService.showError(t("error.editPromptFailed"));
    }
  }

  /**
   * 删除Prompt（移至未分类）
   * @param promptId Prompt ID
   */
  async deletePrompt(promptId: string): Promise<void> {
    try {
      const prompt = await this.storageService.getPrompt(promptId);

      if (!prompt) {
        await this.uiService.showError(t("message.promptNotFound"));
        return;
      }

      const confirmed = await this.uiService.showConfirmDialog(t("message.confirmDelete", prompt.title));

      if (confirmed) {
        await this.storageService.deletePrompt(promptId);
        this._onDidPromptsChange.fire();
        await this.uiService.showInfo("Prompt已移至未分类");
      }
    } catch (error) {
      console.error("删除Prompt失败:", error);
      await this.uiService.showError(t("error.deletePromptFailed"));
    }
  }

  /**
   * 彻底删除未分类的Prompt
   * @param promptId Prompt ID
   */
  async deleteUncategorizedPromptCompletely(promptId: string): Promise<void> {
    try {
      const prompt = await this.storageService.getPrompt(promptId);

      if (!prompt) {
        await this.uiService.showError("提示词不存在");
        return;
      }

      // 直接从存储中删除（彻底删除）
      const prompts = await this.storageService.getPrompts();
      const filteredPrompts = prompts.filter((p) => p.id !== promptId);

      if (filteredPrompts.length === prompts.length) {
        await this.uiService.showError("提示词不存在");
        return;
      }

      // 更新存储
      await this.storageService.savePrompts(filteredPrompts);
      this._onDidPromptsChange.fire();
      await this.uiService.showInfo(`提示词 "${prompt.title}" 已彻底删除`);
    } catch (error) {
      console.error("彻底删除提示词失败:", error);
      await this.uiService.showError("删除失败");
    }
  }

  /**
   * 复制Prompt到剪贴板
   * @param promptId Prompt ID
   */
  async copyPromptToClipboard(promptId: string): Promise<void> {
    try {
      const prompt = await this.storageService.getPrompt(promptId);

      if (!prompt) {
        await this.uiService.showError(t("message.promptNotFound"));
        return;
      }

      // 复制到剪贴板
      await this.clipboardService.copyPrompt(prompt.title, prompt.content, true);

      await this.uiService.showInfo(t("message.promptCopied", prompt.title));
    } catch (error) {
      console.error("复制Prompt失败:", error);
      await this.uiService.showError("复制失败");
    }
  }

  // 搜索和过滤方法

  /**
   * 搜索Prompt
   * @param keyword 搜索关键词
   * @param options 搜索选项
   */
  async searchPrompts(keyword: string, options?: SearchOptions): Promise<PromptItem[]> {
    try {
      const [allPrompts, categories] = await Promise.all([
        this.storageService.getPrompts(),
        this.storageService.getCategories(),
      ]);

      if (!keyword || keyword.trim() === "") {
        return allPrompts;
      }

      const searchTerm = keyword.toLowerCase().trim();
      const matchedPrompts: PromptItem[] = [];

      // 搜索Prompt内容
      for (const prompt of allPrompts) {
        let isMatch = false;

        // 搜索标题（默认启用）
        if (prompt.title.toLowerCase().includes(searchTerm)) {
          isMatch = true;
        }
        // 搜索内容
        else if (options?.includeContent !== false && prompt.content.toLowerCase().includes(searchTerm)) {
          isMatch = true;
        }
        // 搜索标签
        else if (options?.includeTags !== false && prompt.tags?.some((tag) => tag.toLowerCase().includes(searchTerm))) {
          isMatch = true;
        }

        if (isMatch) {
          matchedPrompts.push(prompt);
        }
      }

      // 搜索分类名称
      const matchedCategoryIds: string[] = [];
      for (const category of categories) {
        if (
          category.name.toLowerCase().includes(searchTerm) ||
          category.description?.toLowerCase().includes(searchTerm)
        ) {
          matchedCategoryIds.push(category.id);
        }
      }

      // 添加匹配分类下的所有Prompt
      for (const categoryId of matchedCategoryIds) {
        const categoryPrompts = allPrompts.filter((p) => p.categoryId === categoryId);
        for (const prompt of categoryPrompts) {
          if (!matchedPrompts.some((mp) => mp.id === prompt.id)) {
            matchedPrompts.push(prompt);
          }
        }
      }

      return matchedPrompts;
    } catch (error) {
      console.error("搜索Prompt失败:", error);
      return [];
    }
  }

  /**
   * 搜索Prompt并返回分类信息
   * @param keyword 搜索关键词
   * @param options 搜索选项
   */
  async searchWithCategories(
    keyword: string,
    options?: SearchOptions
  ): Promise<{ prompt: PromptItem; categoryName: string }[]> {
    try {
      const [searchResults, categories] = await Promise.all([
        this.searchPrompts(keyword, options),
        this.storageService.getCategories(),
      ]);

      return searchResults.map((prompt) => {
        const category = categories.find((c) => c.id === prompt.categoryId);
        return {
          prompt,
          categoryName: category ? category.name : "未分类",
        };
      });
    } catch (error) {
      console.error("搜索Prompt失败:", error);
      return [];
    }
  }

  /**
   * 按分类获取Prompt
   * @param categoryId 分类ID
   */
  async getPromptsByCategory(categoryId: string): Promise<PromptItem[]> {
    try {
      const allPrompts = await this.storageService.getPrompts();
      const filtered = allPrompts.filter((prompt) => prompt.categoryId === categoryId);
      return filtered;
    } catch (error) {
      console.error("获取分类Prompt失败:", error);
      return [];
    }
  }

  // 分类管理方法

  /**
   * 获取所有分类
   */
  async getAllCategories(): Promise<PromptCategory[]> {
    return await this.storageService.getCategories();
  }

  /**
   * 添加分类
   * @param category 分类信息
   */
  async addCategory(category: Omit<PromptCategory, "id" | "createdAt">): Promise<void> {
    try {
      const newCategory: PromptCategory = {
        ...category,
        id: this.generateId(),
      };

      await this.storageService.saveCategory(newCategory);
      this._onDidPromptsChange.fire();
      await this.uiService.showInfo(
        `✨ 分类创建成功！\n\n📁 分类名称: ${category.name}\n📝 描述: ${category.description || "无"
        }\n🕒 创建时间: ${new Date().toLocaleString()}`
      );
    } catch (error) {
      console.error("添加分类失败:", error);
      await this.uiService.showError("添加分类失败");
    }
  }

  /**
   * 导出指定分类的Prompt
   * @param categoryId 分类ID
   */
  async exportCategoryPrompts(categoryId: string): Promise<void> {
    try {
      const [allPrompts, categories] = await Promise.all([
        this.storageService.getPrompts(),
        this.storageService.getCategories(),
      ]);

      let prompts: PromptItem[];
      let categoryName: string;

      if (categoryId === "__uncategorized__") {
        prompts = allPrompts.filter((p) => !p.categoryId || !categories.some((c) => c.id === p.categoryId));
        categoryName = "未分类";
      } else {
        prompts = allPrompts.filter((p) => p.categoryId === categoryId);
        const category = categories.find((c) => c.id === categoryId);
        categoryName = category ? category.name : "未知分类";
      }

      if (prompts.length === 0) {
        await this.uiService.showInfo(`${categoryName} 中没有Prompt可导出`);
        return;
      }

      // 选择保存路径
      const filePath = await this.uiService.showSaveDialog(`${categoryName}-prompts`);
      if (!filePath) {
        return;
      }

      // 准备导出数据
      const exportData: ExportData = {
        version: "1.0.0",
        exportedAt: new Date(),
        prompts,
        categories: [],
        metadata: {
          totalCount: prompts.length,
          categoryCount: 0,
          categoryName,
        },
      };

      // 保存到文件
      await this.importExportService.exportToFile(exportData, filePath);

      await this.uiService.showInfo(
        `🎉 导出成功！\n\n📁 分类: ${categoryName}\n📊 导出数据: ${prompts.length} 个Prompt\n💾 文件位置: ${filePath}`
      );
    } catch (error) {
      console.error("导出分类Prompt失败:", error);
      await this.uiService.showError("导出分类Prompt失败");
    }
  }

  /**
   * 编辑分类信息
   * @param categoryId 分类ID
   */
  async editCategory(categoryId: string): Promise<void> {
    try {
      const categories = await this.storageService.getCategories();
      const category = categories.find((c) => c.id === categoryId);

      if (!category) {
        await this.uiService.showError("分类不存在");
        return;
      }

      const editedCategory = await this.uiService.showCategoryEditor(category);

      if (editedCategory) {
        await this.storageService.updateCategory(editedCategory);
        // 触发数据变更事件，确保UI刷新
        this._onDidPromptsChange.fire();
        await this.uiService.showInfo(`分类 "${editedCategory.name}" 更新成功`);
      }
    } catch (error) {
      console.error("编辑分类失败:", error);
      await this.uiService.showError("编辑分类失败");
    }
  }

  /**
   * 删除分类
   * @param categoryId 分类ID
   */
  async deleteCategory(categoryId: string): Promise<void> {
    try {
      const [categories, allPrompts] = await Promise.all([
        this.storageService.getCategories(),
        this.storageService.getPrompts(),
      ]);

      const category = categories.find((c) => c.id === categoryId);
      if (!category) {
        await this.uiService.showError("分类不存在");
        return;
      }

      const categoryPrompts = allPrompts.filter((p) => p.categoryId === categoryId);
      const confirmMessage =
        categoryPrompts.length > 0
          ? `确定要删除分类 "${category.name}" 吗？\n\n该分类下有 ${categoryPrompts.length} 个Prompt，它们将变为未分类状态。`
          : `确定要删除分类 "${category.name}" 吗？`;

      const confirmed = await this.uiService.showConfirmDialog(confirmMessage);
      if (!confirmed) {
        return;
      }

      // 将分类下的Prompt设为未分类
      for (const prompt of categoryPrompts) {
        await this.storageService.updatePrompt({
          ...prompt,
          categoryId: undefined,
        });
      }

      // 删除分类
      await this.storageService.deleteCategory(categoryId);

      // 触发数据变更事件，确保UI刷新
      this._onDidPromptsChange.fire();

      await this.uiService.showInfo(
        `分类 "${category.name}" 删除成功${categoryPrompts.length > 0 ? `，${categoryPrompts.length} 个Prompt已移至未分类` : ""
        }`
      );
    } catch (error) {
      console.error("删除分类失败:", error);
      await this.uiService.showError("删除分类失败");
    }
  }

  // 导入导出方法

  /**
   * 导出所有数据（返回数据对象）
   */
  async exportData(): Promise<ExportData> {
    try {
      const prompts = await this.storageService.getPrompts();
      const categories = await this.storageService.getCategories();

      // 准备导出数据
      const exportData: ExportData = {
        version: "1.0.0",
        exportedAt: new Date(),
        prompts,
        categories,
        metadata: {
          totalCount: prompts.length,
          categoryCount: categories.length,
        },
      };

      return exportData;
    } catch (error) {
      console.error("导出数据失败:", error);
      throw new Error(`导出数据失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  /**
   * 导出数据到文件（用户交互版本）
   */
  async exportToFile(): Promise<void> {
    try {
      // 选择保存路径
      const filePath = await this.uiService.showSaveDialog("prompt-backup");

      if (!filePath) {
        return; // 用户取消了操作
      }

      // 获取导出数据
      const exportData = await this.exportData();

      // 保存到文件
      await this.importExportService.exportToFile(exportData, filePath);

      await this.uiService.showInfo(
        `🎉 导出成功！\n\n📁 文件位置: ${filePath}\n📊 导出数据: ${exportData.prompts.length} 个Prompt, ${exportData.categories.length} 个分类`
      );
    } catch (error) {
      console.error("导出文件失败:", error);
      await this.uiService.showError(`导出失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  /**
   * 导入数据（接受数据对象）
   */
  async importData(data: ExportData): Promise<void> {
    try {
      await this.performImport(data);
    } catch (error) {
      console.error("导入数据失败:", error);
      throw new Error(`导入数据失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  /**
   * 从文件导入数据（用户交互版本）
   */
  async importFromFile(): Promise<void> {
    try {
      // 选择文件
      const filePath = await this.uiService.showOpenDialog();

      if (!filePath) {
        return;
      }

      // 导入数据
      const importData = await this.importExportService.importFromFile(filePath);

      // 显示导入预览
      const message = `准备导入 ${importData.prompts.length} 个Prompt和 ${importData.categories.length} 个分类\n\n是否继续？`;
      const confirmed = await this.uiService.showConfirmDialog(message);

      if (!confirmed) {
        return;
      }

      // 执行导入
      await this.importData(importData);
      await this.uiService.showInfo(
        `🎉 导入成功！\n\n📊 已导入: ${importData.prompts.length} 个Prompt, ${importData.categories.length
        } 个分类\n🕒 导入时间: ${new Date().toLocaleString()}`
      );
    } catch (error) {
      console.error("从文件导入失败:", error);
      await this.uiService.showError(`导入失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  // 统计方法

  /**
   * 获取统计信息
   */
  async getStats(): Promise<PromptStats> {
    try {
      return await this.storageService.getStats();
    } catch (error) {
      console.error("获取统计信息失败:", error);
      return {
        totalPrompts: 0,
        totalCategories: 0,
        topCategories: [],
      };
    }
  }

  // 私有方法

  /**
   * 确保默认数据存在
   */
  private async ensureDefaultData(): Promise<void> {
    try {
      // 检查数据版本
      const storedVersion = this.context?.globalState.get<string>("prompt-manager.data-version");

      // 如果版本是github-default，说明应该使用GitHub数据作为默认数据
      if (storedVersion === "github-default") {
        const githubData = this.context?.globalState.get<any>("prompt-manager.github-data");
        if (githubData) {
          console.log("正在恢复GitHub默认数据...");

          // 总是使用GitHub数据，不检查现有数据（因为可能已经被清理）
          // 先清理现有数据
          await this.storageService.clearAll();

          // 使用保存的GitHub数据
          for (const category of githubData.categories || []) {
            try {
              await this.storageService.saveCategory(category);
            } catch (error) {
              console.warn(`创建GitHub分类 ${category.name} 失败:`, error);
            }
          }

          for (const prompt of githubData.prompts || []) {
            try {
              await this.storageService.savePrompt(prompt);
            } catch (error) {
              console.warn(`创建GitHub提示词 ${prompt.title} 失败:`, error);
            }
          }

          console.log(`GitHub默认数据恢复完成: ${githubData.categories?.length || 0} 个分类, ${githubData.prompts?.length || 0} 个提示词`);
          return;
        }
      }

      // 检查是否需要重置内置默认数据
      const currentVersion = "2.0.0";
      const needsReset = storedVersion !== currentVersion;

      if (needsReset) {
        console.log(`检测到数据版本变化 (旧版本: ${storedVersion || '无'}, 新版本: ${currentVersion})，正在重置数据...`);

        // 清空所有现有数据（包括用户自定义的提示词和分类）
        await this.storageService.clearAll();

        // 创建新的默认分类
        for (const defaultCategory of Object.values(DEFAULT_CATEGORIES)) {
          await this.storageService.saveCategory(defaultCategory);
          console.log(`已创建默认分类: ${defaultCategory.name} (${defaultCategory.id})`);
        }

        // 创建所有分类的说明书提示词
        for (const defaultPrompt of DEFAULT_PROMPTS) {
          // 类型转换以解决readonly兼容性问题
          const promptItem: PromptItem = {
            ...defaultPrompt,
            tags: defaultPrompt.tags ? [...defaultPrompt.tags] : undefined,
          };
          await this.storageService.savePrompt(promptItem);
          console.log(`已创建说明书: ${defaultPrompt.title} (${defaultPrompt.id})`);
        }

        // 标记版本更新
        this.context?.globalState.update("prompt-manager.data-version", currentVersion);
        console.log("数据版本已更新，所有旧数据已被清除");
      } else {
        // 正常初始化逻辑
        const prompts = await this.storageService.getPrompts();
        const categories = await this.storageService.getCategories();

        // 检查并补充缺失的默认分类
        const existingCategoryIds = new Set(categories.map((c) => c.id));
        const missingCategories = Object.values(DEFAULT_CATEGORIES).filter(
          (defaultCategory) => !existingCategoryIds.has(defaultCategory.id)
        );

        if (missingCategories.length > 0) {
          console.log(`发现 ${missingCategories.length} 个缺失的默认分类，正在补充...`);
          for (const defaultCategory of missingCategories) {
            await this.storageService.saveCategory(defaultCategory);
            console.log(`已补充默认分类: ${defaultCategory.name} (${defaultCategory.id})`);
          }
        }

        // 如果完全没有分类，创建所有默认分类
        if (categories.length === 0) {
          for (const defaultCategory of Object.values(DEFAULT_CATEGORIES)) {
            await this.storageService.saveCategory(defaultCategory);
          }
          console.log("已创建默认分类");
        }

        // 获取当前应该存在的提示词ID集合
        const currentPromptIds = new Set(DEFAULT_PROMPTS.map(p => p.id));

        // 清理不再存在的旧提示词（彻底删除）
        const promptsToDelete = prompts.filter(p => !currentPromptIds.has(p.id));
        if (promptsToDelete.length > 0) {
          console.log(`发现 ${promptsToDelete.length} 个过时的提示词，正在清理...`);
          const updatedPrompts = prompts.filter(p => currentPromptIds.has(p.id));
          await this.storageService.savePrompts(updatedPrompts);
          console.log(`已清理 ${promptsToDelete.length} 个过时提示词`);
        }

        // 检查并补充缺失的默认 Prompt
        const existingPromptIds = new Set(prompts.map((p) => p.id));
        const missingPrompts = DEFAULT_PROMPTS.filter((defaultPrompt) => !existingPromptIds.has(defaultPrompt.id));

        if (missingPrompts.length > 0) {
          console.log(`发现 ${missingPrompts.length} 个缺失的说明书，正在补充...`);
          for (const defaultPrompt of missingPrompts) {
            // 类型转换以解决readonly兼容性问题
            const promptItem: PromptItem = {
              ...defaultPrompt,
              tags: defaultPrompt.tags ? [...defaultPrompt.tags] : undefined,
            };
            await this.storageService.savePrompt(promptItem);
            console.log(`已补充说明书: ${defaultPrompt.title} (${defaultPrompt.id})`);
          }
        }
      }
    } catch (error) {
      console.error("创建默认数据失败:", error);
    }
  }

  /**
   * 处理Prompt选择
   */
  private async handlePromptSelection(prompt: PromptItem): Promise<void> {
    try {
      // 读取配置中的默认操作
      const config = vscode.workspace.getConfiguration("promptManager");
      const defaultAction = config.get<string>("defaultAction", "copy");

      // 根据配置映射到对应的操作类型
      const actionType = defaultAction === "chat" ? PromptActionType.SEND_TO_CHAT : PromptActionType.COPY_TO_CLIPBOARD;

      // 执行相应的操作
      await this.executePromptAction(prompt.id, actionType);
    } catch (error) {
      console.error("处理Prompt选择失败:", error);
      await this.uiService.showError("操作失败");
    }
  }

  /**
   * 执行数据导入
   */
  private async performImport(importData: ExportData): Promise<void> {
    try {
      // 导入分类
      for (const category of importData.categories) {
        try {
          await this.storageService.saveCategory(category);
        } catch (error) {
          console.warn(`导入分类 ${category.name} 失败:`, error);
        }
      }

      // 导入Prompt
      for (const prompt of importData.prompts) {
        try {
          await this.storageService.savePrompt(prompt);
        } catch (error) {
          console.warn(`导入Prompt ${prompt.title} 失败:`, error);
        }
      }
    } catch (error) {
      console.error("执行导入失败:", error);
      throw error;
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return "pm_" + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 实现IPromptManager接口缺失的方法

  /**
   * 获取所有Prompt（接口方法）
   */
  async getAllPrompts(): Promise<PromptItem[]> {
    return await this.storageService.getPrompts();
  }

  /**
   * 创建新Prompt（接口方法）
   */
  async createPrompt(prompt: Omit<PromptItem, "id">): Promise<PromptItem> {
    const newPrompt: PromptItem = {
      ...prompt,
      id: this.generateId(),
    };

    await this.storageService.savePrompt(newPrompt);
    return newPrompt;
  }

  /**
   * 更新Prompt（接口方法）
   */
  async updatePrompt(prompt: PromptItem): Promise<void> {
    try {
      await this.storageService.updatePrompt(prompt);
      this._onDidPromptsChange.fire();
    } catch (error) {
      console.error("更新Prompt失败:", error);
      await this.uiService.showError("更新Prompt失败");
    }
  }

  /**
   * 获取存储服务实例（用于TreeView）
   */
  getStorageService(): StorageService {
    if (!this.storageService) {
      throw new Error("PromptManager未初始化，请先调用initialize方法");
    }
    return this.storageService;
  }

  // Cursor集成方法

  /**
   * 发送Prompt到Chat窗口（支持多编辑器）
   * @param promptId Prompt ID
   */
  async sendPromptToChat(promptId: string): Promise<boolean> {
    try {
      const prompt = await this.storageService.getPrompt(promptId);
      if (!prompt) {
        await this.uiService.showError("Prompt不存在");
        return false;
      }

      // Chat集成功能默认启用
      const currentService = this.chatIntegrationFactory.getCurrentChatService();
      if (!currentService) {
        await this.uiService.showInfo("当前环境不支持Chat集成");
        return false;
      }

      const chatOptions: ChatIntegrationOptions = {
        prompt: prompt.content,
        title: prompt.title,
        includeTitle: false, // 默认不包含标题
        addContext: false, // 默认不添加上下文
      };

      const integrationStatus = await currentService.getIntegrationStatus();
      const success = await currentService.sendToChat(chatOptions);

      if (success) {
        if (!(integrationStatus.isEditorEnvironment && !integrationStatus.isCommandAvailable)) {
          await this.uiService.showInfo(`Prompt "${prompt.title}" 已发送到Chat窗口`);
        }
        return true;
      } else {
        await this.uiService.showError("发送到Chat失败");
        return false;
      }
    } catch (error) {
      console.error("发送Prompt到Chat失败:", error);
      await this.uiService.showError("发送失败");
      return false;
    }
  }

  /**
   * 执行特定的Prompt操作
   * @param promptId Prompt ID
   * @param actionType 操作类型
   */
  async executePromptAction(promptId: string, actionType: PromptActionType): Promise<PromptActionResult> {
    try {
      const prompt = await this.storageService.getPrompt(promptId);
      if (!prompt) {
        return {
          success: false,
          actions: [],
          errors: ["Prompt不存在"],
        };
      }

      switch (actionType) {
        case PromptActionType.SEND_TO_CHAT:
        case PromptActionType.SEND_TO_CURSOR_CHAT:
          const success = await this.sendPromptToChat(promptId);
          return {
            success,
            actions: success ? ["发送到Chat"] : [],
            errors: success ? [] : ["发送到Chat失败"],
          };

        case PromptActionType.COPY_TO_CLIPBOARD:
          await this.copyPromptToClipboard(promptId);
          return {
            success: true,
            actions: ["复制到剪贴板"],
            errors: [],
          };

        case PromptActionType.EDIT:
          await this.editPrompt(promptId);
          return {
            success: true,
            actions: ["编辑Prompt"],
            errors: [],
          };

        case PromptActionType.DELETE:
          await this.deletePrompt(promptId);
          return {
            success: true,
            actions: ["删除Prompt"],
            errors: [],
          };

        default:
          return {
            success: false,
            actions: [],
            errors: ["未知的操作类型"],
          };
      }
    } catch (error) {
      console.error("执行Prompt操作失败:", error);
      const errorMessage = `操作失败: ${error instanceof Error ? error.message : String(error)}`;
      return {
        success: false,
        actions: [],
        errors: [errorMessage],
      };
    }
  }

  /**
   * 获取可用的操作类型列表
   * @param promptId Prompt ID
   */
  async getAvailableActions(promptId: string): Promise<PromptActionType[]> {
    try {
      const prompt = await this.storageService.getPrompt(promptId);
      if (!prompt) {
        return [];
      }

      const actions: PromptActionType[] = [
        PromptActionType.COPY_TO_CLIPBOARD,
        PromptActionType.EDIT,
        PromptActionType.DELETE,
      ];

      // 如果支持Chat集成，添加Chat选项
      try {
        const isSupported = await this.chatIntegrationFactory.isCurrentEnvironmentSupported();
        if (isSupported) {
          // Chat集成功能默认启用
          actions.splice(0, 0, PromptActionType.SEND_TO_CHAT);
        }
      } catch (error) {
        console.error("检查Chat集成支持失败:", error);
      }

      return actions;
    } catch (error) {
      console.error("获取可用操作失败:", error);
      return [];
    }
  }

  /**
   * 获取Cursor集成状态（保持向后兼容性）
   */
  async getCursorIntegrationStatus(): Promise<{
    isCursorEnvironment: boolean;
    isCommandAvailable: boolean;
    hasActiveEditor: boolean;
  }> {
    const status = await this.cursorIntegrationService.getIntegrationStatus();
    return {
      isCursorEnvironment: status.isEditorEnvironment,
      isCommandAvailable: status.isCommandAvailable,
      hasActiveEditor: status.hasActiveEditor,
    };
  }

  /**
   * 获取Chat集成状态（支持多编辑器）
   */
  async getChatIntegrationStatus(): Promise<ChatIntegrationStatus | null> {
    const currentService = this.chatIntegrationFactory.getCurrentChatService();
    if (!currentService) {
      return null;
    }
    return await currentService.getIntegrationStatus();
  }

  /**
   * 清空所有数据（添加公共方法代替类型断言访问）
   */
  async clearAllData(): Promise<void> {
    await this.storageService.clearAll();
  }

  /**
   * 从远端拉取数据
   */
  async pullFromRemote(): Promise<void> {
    try {
      // 检查同步状态
      const syncStatus = await this.syncService.getSyncStatus();
      if (!syncStatus.isConfigured) {
        const configure = await this.uiService.showConfirmDialog(
          "同步功能未配置，请先在设置中配置同步服务器和认证令牌。\n\n是否现在打开设置页面？"
        );
        if (configure) {
          await vscode.commands.executeCommand("workbench.action.openSettings", "@ext:prompt-manager-dev.prompt-manager");
        }
        return;
      }

      // 显示确认对话框
      const confirmed = await this.uiService.showConfirmDialog(
        "确定要从远端拉取最新数据吗？\n\n⚠️ 这将覆盖本地所有提示词和分类数据。"
      );

      if (!confirmed) {
        return;
      }

      await this.uiService.showInfo("正在从远端拉取数据，请稍候...");

      const result = await this.syncService.pull({ overwriteLocal: true });

      if (result.success) {
        // 触发数据变更事件
        this._onDidPromptsChange.fire();

        const data = result.data!;
        await this.uiService.showInfo(
          `🎉 同步成功！\n\n📥 拉取完成\n📊 提示词: ${data.promptsSynced} 个\n📁 分类: ${data.categoriesSynced} 个\n\n数据已覆盖本地内容。`
        );
      } else {
        await this.uiService.showError(`同步失败: ${result.error}`);
      }
    } catch (error) {
      console.error("拉取数据失败:", error);
      await this.uiService.showError("拉取失败，请检查网络连接和配置");
    }
  }

  /**
   * 推送数据到远端
   */
  async pushToRemote(): Promise<void> {
    try {
      // 检查同步状态
      const syncStatus = await this.syncService.getSyncStatus();
      if (!syncStatus.isConfigured) {
        const configure = await this.uiService.showConfirmDialog(
          "同步功能未配置，请先在设置中配置同步服务器和认证令牌。\n\n是否现在打开设置页面？"
        );
        if (configure) {
          await vscode.commands.executeCommand("workbench.action.openSettings", "@ext:prompt-manager-dev.prompt-manager");
        }
        return;
      }

      await this.uiService.showInfo("正在推送数据到远端，请稍候...");

      const result = await this.syncService.push();

      if (result.success) {
        const data = result.data!;
        await this.uiService.showInfo(
          `🎉 推送成功！\n\n📤 推送完成\n📊 提示词: ${data.promptsSynced} 个\n📁 分类: ${data.categoriesSynced} 个\n\n数据已同步到远端。`
        );
      } else {
        await this.uiService.showError(`推送失败: ${result.error}`);
      }
    } catch (error) {
      console.error("推送数据失败:", error);
      await this.uiService.showError("推送失败，请检查网络连接和配置");
    }
  }

  /**
   * 重新初始化默认数据（清空所有数据并重新创建默认数据）
   */
  async reinitializeDefaultData(): Promise<void> {
    try {
      // 检查是否有GitHub数据
      const githubData = this.context?.globalState.get<any>("prompt-manager.github-data");

      let message = "确定要重新初始化默认数据吗？\n\n⚠️ 这将删除所有现有的 Prompt 和分类";
      if (githubData) {
        message += "，并恢复到从GitHub拉取的数据";
      } else {
        message += "，并重新创建插件内置的默认数据";
      }
      message += "。\n\n此操作不可恢复！";

      const confirmed = await this.uiService.showConfirmDialog(message);

      if (!confirmed) {
        return;
      }

      // 清空所有数据
      await this.storageService.clearAll();

      // 根据是否有GitHub数据来设置版本
      if (githubData) {
        // 有GitHub数据，设置为github-default版本，会恢复GitHub数据
        this.context?.globalState.update("prompt-manager.data-version", "github-default");
        console.log("重新初始化：将恢复GitHub数据");
      } else {
        // 没有GitHub数据，重置为null，会创建内置默认数据
      this.context?.globalState.update("prompt-manager.data-version", null);
        console.log("重新初始化：将创建内置默认数据");
      }

      // 清除同步标记
      this.context?.globalState.update("prompt-manager.github-synced", false);

      // 重新创建默认数据
      await this.ensureDefaultData();

      // 触发数据变更事件
      this._onDidPromptsChange.fire();

      // 获取实际创建的数据统计
      const createdPrompts = await this.storageService.getPrompts();
      const createdCategories = await this.storageService.getCategories();

      const totalPromptsCount = createdPrompts.length;
      const metapromptCount = createdPrompts.filter(p => p.categoryId === 'metaprompt').length;

      // 检查是否是GitHub数据
      const isGitHubData = this.context?.globalState.get<string>("prompt-manager.data-version") === "github-default";

      const dataSource = isGitHubData ? "GitHub" : "插件内置";

      await this.uiService.showInfo(
        `🎉 默认数据重新初始化完成！\n\n📊 已创建 (${dataSource}数据):\n• ${createdCategories.length} 个默认分类\n• ${totalPromptsCount} 个默认提示词模板\n  └ 其中 ${metapromptCount} 个元提示词模板\n\n其他新分类为空，您可以根据需要添加提示词。`
      );
    } catch (error) {
      console.error("重新初始化默认数据失败:", error);
      await this.uiService.showError("重新初始化失败");
    }
  }
}
