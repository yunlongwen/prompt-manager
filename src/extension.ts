import * as vscode from "vscode";
import { PromptManager } from "./models/PromptManager";
import { PromptTreeDataProvider } from "./views/PromptTreeDataProvider";
import { COMMANDS, TREE_VIEW } from "./constants/constants";
import { t } from "./services/LocalizationService";
import { EventEmitter } from 'events';

// 增加最大监听器限制
EventEmitter.defaultMaxListeners = 20;

/**
 * 全局PromptManager实例
 */
let promptManager: PromptManager;

/**
 * 全局TreeDataProvider实例
 */
let treeDataProvider: PromptTreeDataProvider;

/**
 * 扩展激活函数
 * 当扩展被激活时调用
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log("Prompt Manager 扩展正在激活...");

  try {
    // 初始化PromptManager
    promptManager = PromptManager.getInstance();
    await promptManager.initialize(context);

    // 创建并注册TreeView
    treeDataProvider = new PromptTreeDataProvider(promptManager.getStorageService());
    const treeView = vscode.window.createTreeView(TREE_VIEW.VIEW_ID, {
      treeDataProvider: treeDataProvider,
      showCollapseAll: true,
    });
    context.subscriptions.push(treeView);

    // 初始化搜索状态上下文
    await vscode.commands.executeCommand("setContext", "prompt-manager.searchActive", false);

    // 设置扩展激活状态上下文
    await vscode.commands.executeCommand("setContext", "prompt-manager.activated", true);

    // 监听数据变更事件
    context.subscriptions.push(promptManager.onDidPromptsChange(() => treeDataProvider.refresh()));

    // 监听配置变化（如果需要的话可以在这里添加其他配置监听）
    // context.subscriptions.push(
    //   vscode.workspace.onDidChangeConfiguration((event) => {
    //     // 处理其他配置变化
    //   })
    // );

    // 注册命令处理器
    registerCommands(context);

    console.log("Prompt Manager 扩展激活成功");

    // 显示欢迎信息（仅首次安装或更新时）
    await showWelcomeMessage(context);
  } catch (error) {
    console.error("Prompt Manager 扩展激活失败:", error);
    vscode.window.showErrorMessage(t("error.initializationFailed"));
  }
}

/**
 * 扩展停用函数
 * 当扩展被停用时调用
 */
export function deactivate() {
  console.log("Prompt Manager 扩展正在停用...");

  // 清理资源
  // 清除搜索状态上下文
  vscode.commands.executeCommand("setContext", "prompt-manager.searchActive", false);

  // 清理搜索过滤器
  if (treeDataProvider) {
    treeDataProvider.setSearchFilter(null);
  }

  console.log("Prompt Manager 扩展已停用");
}

/**
 * 注册所有命令处理器
 * @param context 扩展上下文
 */
function registerCommands(context: vscode.ExtensionContext) {
  console.log("正在注册命令处理器...");

  // 注册显示Prompt列表命令
  const showPromptsCmd = vscode.commands.registerCommand(COMMANDS.SHOW_PROMPTS, async () => {
    try {
      await promptManager.showPromptPicker();
    } catch (error) {
      console.error("显示Prompt列表失败:", error);
      vscode.window.showErrorMessage(t("error.showPromptsFailed"));
    }
  });

  // 注册添加Prompt命令
  const addPromptCmd = vscode.commands.registerCommand(COMMANDS.ADD_PROMPT, async () => {
    try {
      await promptManager.addPrompt();
    } catch (error) {
      console.error("添加Prompt失败:", error);
      vscode.window.showErrorMessage(t("error.addPromptFailed"));
    }
  });

  // 注册管理Prompt命令
  const managePromptsCmd = vscode.commands.registerCommand(COMMANDS.MANAGE_PROMPTS, async () => {
    try {
      await showManagementMenu();
    } catch (error) {
      console.error("管理Prompt失败:", error);
      vscode.window.showErrorMessage(t("error.managePromptsFailed"));
    }
  });

  // 注册导出Prompt命令
  const exportPromptsCmd = vscode.commands.registerCommand(COMMANDS.EXPORT_PROMPTS, async () => {
    try {
      await promptManager.exportToFile();
    } catch (error) {
      console.error("导出Prompt失败:", error);
      vscode.window.showErrorMessage(t("error.exportFailed"));
    }
  });

  // 注册导入Prompt命令
  const importPromptsCmd = vscode.commands.registerCommand(COMMANDS.IMPORT_PROMPTS, async () => {
    try {
      await promptManager.importFromFile();
    } catch (error) {
      console.error("导入Prompt失败:", error);
      vscode.window.showErrorMessage(t("error.importFailed"));
    }
  });

  // 注册TreeView相关命令
  const refreshTreeCmd = vscode.commands.registerCommand(COMMANDS.REFRESH_TREE, async () => {
    try {
      treeDataProvider.refresh();
    } catch (error) {
      console.error("刷新TreeView失败:", error);
      vscode.window.showErrorMessage(t("error.refreshTreeFailed"));
    }
  });

  const addPromptFromTreeCmd = vscode.commands.registerCommand(COMMANDS.ADD_PROMPT_FROM_TREE, async () => {
    try {
      await promptManager.addPrompt();
    } catch (error) {
      console.error("从TreeView添加Prompt失败:", error);
      vscode.window.showErrorMessage(t("error.addPromptFailed"));
    }
  });

  const editPromptFromTreeCmd = vscode.commands.registerCommand(COMMANDS.EDIT_PROMPT_FROM_TREE, async (promptItem) => {
    try {
      if (promptItem && promptItem.promptData) {
        await promptManager.editPrompt(promptItem.promptData.id);
      }
    } catch (error) {
      console.error("从TreeView编辑Prompt失败:", error);
      vscode.window.showErrorMessage(t("error.editPromptFailed"));
    }
  });

  const deletePromptFromTreeCmd = vscode.commands.registerCommand(
    COMMANDS.DELETE_PROMPT_FROM_TREE,
    async (promptItem) => {
      try {
        if (promptItem && promptItem.promptData) {
          await promptManager.deletePrompt(promptItem.promptData.id);
        }
      } catch (error) {
        console.error("从TreeView删除Prompt失败:", error);
        vscode.window.showErrorMessage(t("error.deletePromptFailed"));
      }
    }
  );

  const copyPromptFromTreeCmd = vscode.commands.registerCommand(COMMANDS.COPY_PROMPT_FROM_TREE, async (promptItem) => {
    try {
      if (promptItem && promptItem.promptData) {
        await promptManager.copyPromptToClipboard(promptItem.promptData.id);
      }
    } catch (error) {
      console.error("从TreeView复制Prompt失败:", error);
      vscode.window.showErrorMessage(t("error.copyPromptFailed"));
    }
  });

  // 注册搜索相关命令
  const searchPromptsCmd = vscode.commands.registerCommand(COMMANDS.SEARCH_PROMPTS, async () => {
    try {
      const keyword = await vscode.window.showInputBox({
        title: t("ui.search.title"),
        placeHolder: t("ui.input.searchPlaceholder"),
        prompt: t("ui.input.searchPrompt"),
        value: treeDataProvider.getSearchFilter() || "",
        validateInput: (value) => {
          // 实时显示搜索结果提示
          if (value && value.trim()) {
            return null; // 有效输入
          }
          return null; // 允许空输入（清除搜索）
        },
      });

      if (keyword !== undefined) {
        // 设置搜索状态上下文
        await vscode.commands.executeCommand("setContext", "prompt-manager.searchActive", keyword !== "");

        // 应用搜索过滤器
        treeDataProvider.setSearchFilter(keyword || null);

        // 显示搜索结果提示
        if (keyword && keyword.trim()) {
          vscode.window.showInformationMessage(t("ui.search.searching", keyword.trim()));
        } else {
          vscode.window.showInformationMessage(t("ui.search.cleared"));
        }
      }
    } catch (error) {
      console.error("搜索Prompt失败:", error);
      vscode.window.showErrorMessage(t("error.searchPromptsFailed"));
    }
  });

  const clearSearchCmd = vscode.commands.registerCommand(COMMANDS.CLEAR_SEARCH, async () => {
    try {
      // 清除搜索过滤器
      treeDataProvider.setSearchFilter(null);

      // 清除搜索状态上下文
      await vscode.commands.executeCommand("setContext", "prompt-manager.searchActive", false);

      // 显示清除成功提示
      vscode.window.showInformationMessage(t("ui.search.showAll"));
    } catch (error) {
      console.error("清除搜索失败:", error);
      vscode.window.showErrorMessage(t("error.clearSearchFailed"));
    }
  });

  // 注册分类操作相关命令

  const editCategoryFromTreeCmd = vscode.commands.registerCommand(
    COMMANDS.EDIT_CATEGORY_FROM_TREE,
    async (categoryItem) => {
      try {
        if (categoryItem && categoryItem.categoryData && categoryItem.id !== "__uncategorized__") {
          await promptManager.editCategory(categoryItem.id);
          // 移除手动刷新，依赖事件机制自动刷新（与editPrompt保持一致）
        }
      } catch (error) {
        console.error("从TreeView编辑分类失败:", error);
        vscode.window.showErrorMessage(t("error.editPromptFailed"));
      }
    }
  );

  const addPromptToCategoryFromTreeCmd = vscode.commands.registerCommand(
    COMMANDS.ADD_PROMPT_TO_CATEGORY_FROM_TREE,
    async (categoryItem) => {
      try {
        if (categoryItem && categoryItem.categoryData) {
          await promptManager.addPrompt();
          // addPrompt已经有事件触发机制，移除手动刷新
        }
      } catch (error) {
        console.error("从TreeView添加Prompt到分类失败:", error);
        vscode.window.showErrorMessage(t("error.addPromptFailed"));
      }
    }
  );

  const exportCategoryFromTreeCmd = vscode.commands.registerCommand(
    COMMANDS.EXPORT_CATEGORY_FROM_TREE,
    async (categoryItem) => {
      try {
        if (categoryItem && categoryItem.categoryData) {
          await promptManager.exportCategoryPrompts(categoryItem.id);
        }
      } catch (error) {
        console.error("从TreeView导出分类失败:", error);
        vscode.window.showErrorMessage(t("error.exportFailed"));
      }
    }
  );

  const deleteCategoryFromTreeCmd = vscode.commands.registerCommand(
    COMMANDS.DELETE_CATEGORY_FROM_TREE,
    async (categoryItem) => {
      try {
        if (categoryItem && categoryItem.categoryData && categoryItem.id !== "__uncategorized__") {
          await promptManager.deleteCategory(categoryItem.id);
          // deleteCategory已经有事件触发机制，移除手动刷新
        }
      } catch (error) {
        console.error("从TreeView删除分类失败:", error);
        vscode.window.showErrorMessage(t("error.deletePromptFailed"));
      }
    }
  );

  // 说明书相关命令
  const viewGuideFromTreeCmd = vscode.commands.registerCommand(COMMANDS.VIEW_GUIDE_FROM_TREE, async (guideItem) => {
    try {
      if (guideItem && guideItem.guideData) {
        await viewGuide(guideItem.guideData);
      }
    } catch (error) {
      console.error("从TreeView查看说明书失败:", error);
      vscode.window.showErrorMessage("查看说明书失败");
    }
  });

  const editGuideFromTreeCmd = vscode.commands.registerCommand(COMMANDS.EDIT_GUIDE_FROM_TREE, async (guideItem) => {
    try {
      if (guideItem && guideItem.guideData) {
        await editGuide(guideItem.guideData, guideItem.categoryId);
      }
    } catch (error) {
      console.error("从TreeView编辑说明书失败:", error);
      vscode.window.showErrorMessage("编辑说明书失败");
    }
  });

  // 未分类提示词彻底删除命令
  const deleteUncategorizedPromptFromTreeCmd = vscode.commands.registerCommand(
    COMMANDS.DELETE_UNCATEGORIZED_PROMPT_FROM_TREE,
    async (promptItem) => {
      try {
        if (promptItem && promptItem.promptData && promptItem.parentId === "__uncategorized__") {
          const confirmed = await vscode.window.showWarningMessage(
            `确定要彻底删除提示词 "${promptItem.promptData.title}" 吗？\n\n此操作不可恢复！`,
            { modal: true },
            "确定删除"
          );

          if (confirmed === "确定删除") {
            await promptManager.deleteUncategorizedPromptCompletely(promptItem.promptData.id);
          }
        }
      } catch (error) {
        console.error("从TreeView彻底删除未分类提示词失败:", error);
        vscode.window.showErrorMessage("删除失败");
      }
    }
  );

  // 同步相关命令（侧边栏按钮）
  const gitPushCmd = vscode.commands.registerCommand(COMMANDS.GIT_PUSH, async () => {
    try {
      await gitPush();
    } catch (error) {
      console.error("Git推送失败:", error);
      vscode.window.showErrorMessage("Git推送失败");
    }
  });

  const gitPullCmd = vscode.commands.registerCommand(COMMANDS.GIT_PULL, async () => {
    try {
      await gitPull();
    } catch (error) {
      console.error("Git拉取失败:", error);
      vscode.window.showErrorMessage("Git拉取失败");
    }
  });

  // 注册Chat集成相关命令（支持多编辑器）
  const sendToChatCmd = vscode.commands.registerCommand(COMMANDS.SEND_TO_CHAT, async () => {
    try {
      // 显示Prompt选择器，然后发送到Chat
      const prompts = await promptManager.getStorageService().getPrompts();
      if (prompts.length === 0) {
        vscode.window.showInformationMessage(t("error.noPrompts"));
        return;
      }

      const selectedPrompt = await vscode.window.showQuickPick(
        prompts.map((p) => ({
          label: p.title,
          description: "",
          detail: p.content.length > 100 ? p.content.substring(0, 100) + "..." : p.content,
          promptItem: p,
        })),
        {
          placeHolder: t("ui.picker.selectPrompt"),
          matchOnDescription: true,
          matchOnDetail: true,
        }
      );

      if (selectedPrompt) {
        await promptManager.sendPromptToChat(selectedPrompt.promptItem.id);
      }
    } catch (error) {
      console.error("发送到Chat失败:", error);
      vscode.window.showErrorMessage(t("error.chatSendFailed"));
    }
  });

  const sendToChatFromTreeCmd = vscode.commands.registerCommand(COMMANDS.SEND_TO_CHAT_FROM_TREE, async (promptItem) => {
    try {
      if (promptItem && promptItem.promptData) {
        await promptManager.sendPromptToChat(promptItem.promptData.id);
      }
    } catch (error) {
      console.error("从TreeView发送到Chat失败:", error);
      vscode.window.showErrorMessage(t("error.chatSendFailed"));
    }
  });

  // 注册空白区域右键菜单命令
  const addCategoryFromTreeCmd = vscode.commands.registerCommand(COMMANDS.ADD_CATEGORY_FROM_TREE, async () => {
    try {
      await addNewCategory();
      // addNewCategory中的addCategory已经有事件触发机制，移除手动刷新
    } catch (error) {
      console.error("从TreeView添加分类失败:", error);
      vscode.window.showErrorMessage(t("error.addPromptFailed"));
    }
  });

  // 注册设置相关命令
  const openSettingsCmd = vscode.commands.registerCommand(COMMANDS.OPEN_SETTINGS, async () => {
    try {
      // 使用workbench.action.openSettings命令打开插件设置页面
      await vscode.commands.executeCommand("workbench.action.openSettings", "@ext:prompt-manager-dev.prompt-manager");
    } catch (error) {
      console.error("打开设置失败:", error);
      vscode.window.showErrorMessage(t("error.generic"));
    }
  });

  // 注册重新初始化默认数据命令
  const reinitializeDefaultDataCmd = vscode.commands.registerCommand(COMMANDS.REINITIALIZE_DEFAULT_DATA, async () => {
    try {
      await promptManager.reinitializeDefaultData();
    } catch (error) {
      console.error("重新初始化默认数据失败:", error);
      vscode.window.showErrorMessage(t("error.reinitializeDataFailed"));
    }
  });

  // 将命令添加到上下文订阅中
  context.subscriptions.push(
    showPromptsCmd,
    addPromptCmd,
    managePromptsCmd,
    exportPromptsCmd,
    importPromptsCmd,
    refreshTreeCmd,
    addPromptFromTreeCmd,
    searchPromptsCmd,
    clearSearchCmd,
    editPromptFromTreeCmd,
    deletePromptFromTreeCmd,
    copyPromptFromTreeCmd,
    editCategoryFromTreeCmd,
    addPromptToCategoryFromTreeCmd,
    exportCategoryFromTreeCmd,
    deleteCategoryFromTreeCmd,
    // 空白区域右键菜单命令
    addCategoryFromTreeCmd,
    // Chat集成命令
    sendToChatCmd,
    sendToChatFromTreeCmd,
    // 设置命令
    openSettingsCmd,
    // 数据管理命令
    reinitializeDefaultDataCmd,
    // 说明书相关命令
    viewGuideFromTreeCmd,
    editGuideFromTreeCmd,
    // 同步相关命令（侧边栏按钮）
    gitPushCmd,
    gitPullCmd
  );

  console.log("命令处理器注册完成");
}

/**
 * 显示管理菜单
 */
async function showManagementMenu() {
  const actions = [
    {
      label: "$(symbol-text) " + t("management.browse"),
      description: t("management.browseDesc"),
      action: "browse",
    },
    {
      label: "$(plus) " + t("management.add"),
      description: t("management.addDesc"),
      action: "add",
    },
    {
      label: "$(edit) " + t("management.manage"),
      description: t("management.manageDesc"),
      action: "manage",
    },

    {
      label: "$(folder) " + t("management.categories"),
      description: t("management.categoriesDesc"),
      action: "categories",
    },
    {
      label: "$(export) " + t("management.export"),
      description: t("management.exportDesc"),
      action: "export",
    },
    {
      label: "$(import) " + t("management.import"),
      description: t("management.importDesc"),
      action: "import",
    },
    {
      label: "$(graph) " + t("management.stats"),
      description: t("management.statsDesc"),
      action: "stats",
    },
    {
      label: "$(trash) " + t("management.clear"),
      description: t("management.clearDesc"),
      action: "clear",
    },
    {
      label: "$(refresh) " + t("management.reinitialize"),
      description: t("management.reinitializeDesc"),
      action: "reinitialize",
    },
  ];

  const selected = await vscode.window.showQuickPick(actions, {
    title: "Prompt Manager - " + t("management.browse"),
    placeHolder: t("ui.picker.selectOperation"),
  });

  if (!selected) {
    return;
  }

  switch (selected.action) {
    case "browse":
      await promptManager.showPromptPicker();
      break;

    case "add":
      await promptManager.addPrompt();
      break;

    case "manage":
      await showPromptManagement();
      break;

    case "categories":
      await showCategoryManagement();
      break;

    case "export":
      await promptManager.exportToFile();
      break;

    case "import":
      await promptManager.importFromFile();
      break;

    case "stats":
      await showStatistics();
      break;

    case "clear":
      await clearAllData();
      break;

    case "reinitialize":
      await promptManager.reinitializeDefaultData();
      break;

    default:
      vscode.window.showInformationMessage(t("message.operationCancelled"));
  }
}

/**
 * 显示Prompt管理界面
 */
async function showPromptManagement() {
  try {
    const prompts = await promptManager.getStorageService().getPrompts();

    if (prompts.length === 0) {
      vscode.window.showInformationMessage(t("error.noPrompts"));
      return;
    }

    // 准备Prompt选择项
    const promptItems = prompts.map((prompt) => ({
      label: `$(symbol-text) ${prompt.title}`,
      detail: `分类: ${prompt.categoryId || "无"}`,
      prompt: prompt,
    }));

    const selected = await vscode.window.showQuickPick(promptItems, {
      title: "🛠️ Prompt管理 - 选择要管理的Prompt",
      placeHolder: "选择要编辑或删除的Prompt...",
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selected) {
      return;
    }

    // 显示操作选项
    const actions = [
      {
        label: "$(edit) 编辑Prompt",
        description: "修改Prompt的标题、内容、分类等",
        action: "edit",
      },

      {
        label: "$(copy) 复制到剪贴板",
        description: "复制Prompt内容",
        action: "copy",
      },
      {
        label: "$(trash) 删除Prompt",
        description: "永久删除这个Prompt（不可恢复）",
        action: "delete",
      },
    ];

    const action = await vscode.window.showQuickPick(actions, {
      title: `操作: ${selected.prompt.title}`,
      placeHolder: "选择要执行的操作...",
    });

    if (!action) {
      return;
    }

    // 执行操作
    switch (action.action) {
      case "edit":
        await promptManager.editPrompt(selected.prompt.id);
        // 编辑后可以继续管理其他Prompt
        await showPromptManagement();
        break;

      case "copy":
        await promptManager.copyPromptToClipboard(selected.prompt.id);
        break;

      case "delete":
        await promptManager.deletePrompt(selected.prompt.id);
        // 删除后返回管理界面（如果还有其他Prompt）
        const remainingPrompts = await promptManager.getStorageService().getPrompts();
        if (remainingPrompts.length > 0) {
          await showPromptManagement();
        }
        break;

      default:
        break;
    }
  } catch (error) {
    console.error("Prompt管理失败:", error);
    vscode.window.showErrorMessage(t("error.managePromptsFailed"));
  }
}

/**
 * 显示分类管理
 */
async function showCategoryManagement() {
  try {
    const categories = await promptManager.getStorageService().getCategories();

    const actions = [
      {
        label: "$(plus) 添加新分类",
        description: "创建新的Prompt分类",
        action: "add",
      },
      {
        label: "$(list-unordered) 查看所有分类",
        description: "浏览现有分类",
        action: "list",
      },
    ];

    const selected = await vscode.window.showQuickPick(actions, {
      title: "分类管理",
      placeHolder: "选择操作...",
    });

    if (!selected) {
      return;
    }

    if (selected.action === "add") {
      await addNewCategory();
    } else if (selected.action === "list") {
      await listCategories(categories);
    }
  } catch (error) {
    console.error("分类管理失败:", error);
    vscode.window.showErrorMessage("分类管理失败");
  }
}

/**
 * 添加新分类
 */
async function addNewCategory() {
  try {
    const name = await vscode.window.showInputBox({
      title: "添加新分类",
      prompt: "请输入分类名称",
      placeHolder: "输入分类名称",
      validateInput: (value) => {
        if (!value || value.trim() === "") {
          return "分类名称不能为空";
        }
        return null;
      },
    });

    if (!name) {
      return;
    }

    const description = await vscode.window.showInputBox({
      title: "添加新分类",
      prompt: "请输入分类描述（可选）",
      placeHolder: "输入分类描述",
    });

    await promptManager.addCategory({
      name: name.trim(),
      description: description?.trim(),
      sortOrder: 0,
    });
  } catch (error) {
    console.error("添加分类失败:", error);
    vscode.window.showErrorMessage("添加分类失败");
  }
}

/**
 * 列出所有分类
 */
async function listCategories(categories: any[]) {
  if (categories.length === 0) {
    vscode.window.showInformationMessage("暂无分类");
    return;
  }

  const items = categories.map((category) => ({
    label: `$(symbol-folder) ${category.name}`,
    description: category.description || "",
    detail: `创建于 ${category.createdAt.toLocaleDateString()}`,
    category: category,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    title: "所有分类",
    placeHolder: "选择分类查看Prompt...",
  });

  if (selected) {
    const prompts = await promptManager.getPromptsByCategory((selected as any).category.id);

    if (prompts.length === 0) {
      vscode.window.showInformationMessage(`分类 "${(selected as any).category.name}" 中暂无Prompt`);
      return;
    }

    const uiService = (promptManager as any).uiService;
    const selectedPrompt = await uiService.showPromptPicker(prompts);

    if (selectedPrompt) {
      await promptManager.copyPromptToClipboard(selectedPrompt.id);
    }
  }
}

/**
 * 显示统计信息
 */
async function showStatistics() {
  try {
    const stats = await promptManager.getStats();

    // 准备统计信息项目
    const statisticsItems = [
      {
        label: "📊 总体统计",
        description: "",
        detail: `Prompt总数: ${stats.totalPrompts} | 分类总数: ${stats.totalCategories}`,
        kind: vscode.QuickPickItemKind.Separator,
      },
      {
        label: "📝 Prompt数量",
        description: `${stats.totalPrompts} 个`,
        detail: "管理的所有Prompt模板数量",
      },
      {
        label: "📁 分类数量",
        description: `${stats.totalCategories} 个`,
        detail: "已创建的分类数量",
      },
    ];

    // 添加热门分类
    if (stats.topCategories && stats.topCategories.length > 0) {
      statisticsItems.push({
        label: "",
        description: "",
        detail: "",
        kind: vscode.QuickPickItemKind.Separator,
      });

      statisticsItems.push({
        label: "🏆 热门分类",
        description: "",
        detail: "",
        kind: vscode.QuickPickItemKind.Separator,
      });

      stats.topCategories.slice(0, 3).forEach((categoryName, index) => {
        statisticsItems.push({
          label: `${index + 1}. ${categoryName}`,
          description: "热门分类",
          detail: "包含较多Prompt的分类",
        });
      });
    }

    const selected = await vscode.window.showQuickPick(statisticsItems, {
      title: "📊 Prompt Manager - 统计信息",
      placeHolder: "浏览统计数据...",
      matchOnDescription: true,
      matchOnDetail: true,
    });
  } catch (error) {
    console.error("获取统计信息失败:", error);
    vscode.window.showErrorMessage("获取统计信息失败");
  }
}

/**
 * 清空所有数据
 */
async function clearAllData() {
  try {
    const confirmed = await vscode.window.showWarningMessage(
      "⚠️ 警告：此操作将删除所有Prompt和分类数据，且不可恢复！\n\n确定要继续吗？",
      { modal: true },
      "确定删除",
      "取消"
    );

    if (confirmed === "确定删除") {
      // 使用公共的clearAllData方法
      await promptManager.clearAllData();

      vscode.window.showInformationMessage("所有数据已清空");
    }
  } catch (error) {
    console.error("清空数据失败:", error);
    vscode.window.showErrorMessage("清空数据失败");
  }
}

/**
 * 查看说明书
 */
async function viewGuide(guidePrompt: any) {
  try {
    // 创建一个新的文档来显示说明书内容
    const document = await vscode.workspace.openTextDocument({
      content: guidePrompt.content,
      language: 'markdown',
    });

    // 显示文档
    await vscode.window.showTextDocument(document, {
      preview: true,
      viewColumn: vscode.ViewColumn.One,
    });

    // 设置文档为只读模式
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document === document) {
      // 通过禁用编辑功能来实现只读效果
      const disposable = vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document === document && e.contentChanges.length > 0) {
          vscode.window.showInformationMessage("说明书为只读模式，如需修改请使用编辑功能");
          // 撤销更改
          setTimeout(() => {
            vscode.commands.executeCommand('undo');
          }, 10);
        }
      });

      // 5秒后自动清理监听器
      setTimeout(() => {
        disposable.dispose();
      }, 5000);
    }
  } catch (error) {
    console.error("查看说明书失败:", error);
    vscode.window.showErrorMessage("查看说明书失败");
  }
}

/**
 * 编辑说明书
 */
async function editGuide(guidePrompt: any, categoryId: string) {
  try {
    // 创建一个新的文档来编辑说明书内容
    const document = await vscode.workspace.openTextDocument({
      content: guidePrompt.content,
      language: 'markdown',
    });

    // 显示文档
    const editor = await vscode.window.showTextDocument(document, {
      preview: false,
      viewColumn: vscode.ViewColumn.One,
    });

    // 监听文档保存事件，自动更新说明书
    const saveListener = vscode.workspace.onDidSaveTextDocument(async (savedDoc) => {
      if (savedDoc === document) {
        try {
          // 获取更新后的内容
          const updatedContent = savedDoc.getText();

          // 更新说明书提示词
          const updatedPrompt = {
            ...guidePrompt,
            content: updatedContent,
          };

          await promptManager.updatePrompt(updatedPrompt);

          vscode.window.showInformationMessage("说明书已更新");

          // 清理监听器
          saveListener.dispose();
        } catch (error) {
          console.error("更新说明书失败:", error);
          vscode.window.showErrorMessage("更新说明书失败");
        }
      }
    });

    // 监听文档关闭事件，清理监听器
    const closeListener = vscode.workspace.onDidCloseTextDocument((closedDoc) => {
      if (closedDoc === document) {
        saveListener.dispose();
        closeListener.dispose();
      }
    });

  } catch (error) {
    console.error("编辑说明书失败:", error);
    vscode.window.showErrorMessage("编辑说明书失败");
  }
}

/**
 * 显示欢迎信息
 */
async function showWelcomeMessage(context: vscode.ExtensionContext) {
  try {
    const currentVersion = vscode.extensions.getExtension("prompt-manager-dev.prompt-manager")?.packageJSON.version;
    const lastVersion = context.globalState.get<string>("lastVersion");
    const hasShownInitialWelcome = context.globalState.get<boolean>("hasShownInitialWelcome", false);

    // 只在真正的首次安装时显示欢迎信息
    if (!lastVersion && !hasShownInitialWelcome) {
              const message = `🎉 欢迎使用 Prompt Manager！\n\n扩展已激活，您可以直接使用侧边栏或 Shift+P 快捷键。`;

      const action = await vscode.window.showInformationMessage(message, "了解更多", "开始使用");

      if (action === "开始使用") {
        await promptManager.showPromptPicker();
      }

      // 标记已显示初始欢迎信息
      await context.globalState.update("hasShownInitialWelcome", true);
    }

    // 保存当前版本（用于未来的版本比较，但不再每次都弹窗）
    if (currentVersion && lastVersion !== currentVersion) {
      await context.globalState.update("lastVersion", currentVersion);
    }
  } catch (error) {
    console.error("显示欢迎信息失败:", error);
  }
}

/**
 * 执行Git Push操作 - 推送提示词数据到GitHub
 */
async function gitPush(): Promise<void> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage("未找到工作区");
      return;
    }

    // 显示确认对话框
    const confirmed = await vscode.window.showInformationMessage(
      `确定要推送提示词数据到GitHub吗？\n\n这将导出当前的所有提示词并推送到远程仓库。`,
      { modal: false },
      "确认推送"
    );

    if (confirmed !== "确认推送") {
      return;
    }

    // 显示进度提示
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "推送提示词数据",
      cancellable: false
    }, async (progress) => {
      progress.report({ message: "正在导出提示词数据..." });

      // 导出当前提示词数据
      const exportData = await promptManager.exportData();

      progress.report({ message: "正在写入数据文件..." });

      // 将数据写入到工作区的同步文件
      const syncFilePath = vscode.Uri.joinPath(workspaceFolder.uri, '.prompt-manager-sync.json');
      const jsonContent = JSON.stringify(exportData, null, 2);
      await vscode.workspace.fs.writeFile(syncFilePath, Buffer.from(jsonContent, 'utf8'));

      progress.report({ message: "正在推送到GitHub..." });

      // 使用终端执行git命令推送
      const terminal = vscode.window.createTerminal({
        name: "Push Prompts",
        cwd: workspaceFolder.uri.fsPath
      });

      return new Promise<void>((resolve, reject) => {
        let completed = false;

        const disposable = vscode.window.onDidCloseTerminal(closedTerminal => {
          if (closedTerminal === terminal && !completed) {
            completed = true;
            disposable.dispose();
            resolve();
          }
        });

        terminal.show();
        terminal.sendText(`git add .prompt-manager-sync.json`);
        terminal.sendText(`git commit -m "Sync prompt data: ${new Date().toISOString()}"`);
        terminal.sendText(`git push`);

        // 设置超时，如果10秒内没有完成则认为成功
        setTimeout(() => {
          if (!completed) {
            completed = true;
            terminal.dispose();
            disposable.dispose();
            resolve();
          }
        }, 10000);

        vscode.window.showInformationMessage("提示词数据已推送到GitHub");
      });
    });

  } catch (error) {
    console.error("推送提示词数据失败:", error);
    vscode.window.showErrorMessage(`推送失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 执行Git Pull操作 - 从GitHub拉取最新的提示词数据并覆盖本地数据库
 */
async function gitPull(): Promise<void> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage("未找到工作区");
      return;
    }

    // 显示确认对话框
    const confirmed = await vscode.window.showWarningMessage(
      `⚠️ 确定要从GitHub拉取提示词数据吗？\n\n这将覆盖当前的所有提示词和分类数据，且不可恢复！`,
      { modal: true },
      "确认拉取"
    );

    if (confirmed !== "确认拉取") {
      return;
    }

    // 显示进度提示
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "拉取提示词数据",
      cancellable: false
    }, async (progress) => {
      progress.report({ message: "正在从GitHub拉取..." });

      // 使用终端执行git pull
      const terminal = vscode.window.createTerminal({
        name: "Pull Prompts",
        cwd: workspaceFolder.uri.fsPath
      });

      return new Promise<void>((resolve, reject) => {
        let completed = false;

        const disposable = vscode.window.onDidCloseTerminal(closedTerminal => {
          if (closedTerminal === terminal && !completed) {
            completed = true;
            disposable.dispose();

            // 拉取完成后，读取同步文件并导入
            setTimeout(async () => {
              try {
                const syncFilePath = vscode.Uri.joinPath(workspaceFolder.uri, '.prompt-manager-sync.json');
                const fileContent = await vscode.workspace.fs.readFile(syncFilePath);
                const importData = JSON.parse(fileContent.toString());

                progress.report({ message: "正在导入提示词数据..." });
                await promptManager.importData(importData);

                vscode.window.showInformationMessage("提示词数据已从GitHub成功拉取并导入");
                resolve();
              } catch (importError) {
                console.error("导入数据失败:", importError);
                vscode.window.showErrorMessage("数据拉取成功，但导入失败");
                reject(importError);
              }
            }, 1000);
          }
        });

        terminal.show();
        terminal.sendText(`git pull`);

        // 设置超时
        setTimeout(() => {
          if (!completed) {
            completed = true;
            terminal.dispose();
            disposable.dispose();
            reject(new Error("拉取超时"));
          }
        }, 15000);
      });
    });

  } catch (error) {
    console.error("拉取提示词数据失败:", error);
    vscode.window.showErrorMessage(`拉取失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
