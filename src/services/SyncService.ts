import * as vscode from "vscode";
import { ExportData, ISyncService, SyncOptions, SyncResult } from "../types";
import { StorageService } from "./StorageService";

/**
 * 同步服务实现
 * 处理与远端服务器的数据同步功能
 */
export class SyncService implements ISyncService {
  private static instance: SyncService;
  private storageService: StorageService;

  /**
   * 获取单例实例
   */
  static getInstance(storageService: StorageService): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService(storageService);
    }
    return SyncService.instance;
  }

  private constructor(storageService: StorageService) {
    this.storageService = storageService;
  }

  /**
   * 获取同步服务器URL
   */
  private getSyncServerUrl(): string {
    // 从配置中读取同步服务器地址，如果没有则使用默认地址
    const config = vscode.workspace.getConfiguration("promptManager");
    return config.get<string>("syncServerUrl", "https://api.prompt-manager.dev/sync");
  }

  /**
   * 获取用户认证令牌
   */
  private getAuthToken(): string | undefined {
    const config = vscode.workspace.getConfiguration("promptManager");
    return config.get<string>("syncAuthToken");
  }

  /**
   * 从远端拉取数据
   */
  async pull(options: SyncOptions = {}): Promise<SyncResult> {
    try {
      const serverUrl = this.getSyncServerUrl();
      const authToken = this.getAuthToken();

      if (!authToken) {
        return {
          success: false,
          error: "未配置同步认证令牌，请在设置中配置 promptManager.syncAuthToken",
          errorCode: "NO_AUTH_TOKEN",
        };
      }

      console.log("正在从远端拉取数据...");

      // TODO: 实现实际的网络请求
      // VSCode扩展环境中需要使用适当的网络请求方式
      // 目前返回模拟成功结果
      return {
        success: false,
        error: "同步功能正在开发中，请稍后使用",
        errorCode: "NOT_IMPLEMENTED",
      };

      /*
      const response = await fetch(`${serverUrl}/pull`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
          "User-Agent": "PromptManager-VSCode",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `拉取失败: ${response.status} ${response.statusText}\n${errorText}`,
          errorCode: "PULL_FAILED",
        };
      }

      const remoteData: ExportData = await response.json();

      // 验证数据格式
      if (!remoteData.prompts || !Array.isArray(remoteData.prompts)) {
        return {
          success: false,
          error: "远端数据格式错误：缺少prompts字段",
          errorCode: "INVALID_DATA_FORMAT",
        };
      }

      if (!remoteData.categories || !Array.isArray(remoteData.categories)) {
        return {
          success: false,
          error: "远端数据格式错误：缺少categories字段",
          errorCode: "INVALID_DATA_FORMAT",
        };
      }

      console.log(`成功拉取数据：${remoteData.prompts.length}个提示词，${remoteData.categories.length}个分类`);

      // 如果指定了覆盖本地数据，则清空本地数据
      if (options.force || options.overwriteLocal) {
        await this.storageService.clearAll();
      }

      // 导入远端数据
      await this.storageService.saveCategories(remoteData.categories);
      await this.storageService.savePrompts(remoteData.prompts);

      return {
        success: true,
        data: {
          promptsSynced: remoteData.prompts.length,
          categoriesSynced: remoteData.categories.length,
          action: options.force ? "force_pull" : "pull",
        },
      };
      */
    } catch (error) {
      console.error("拉取数据失败:", error);
      return {
        success: false,
        error: `网络错误: ${error instanceof Error ? error.message : "未知错误"}`,
        errorCode: "NETWORK_ERROR",
      };
    }
  }

  /**
   * 推送数据到远端
   */
  async push(options: SyncOptions = {}): Promise<SyncResult> {
    try {
      const serverUrl = this.getSyncServerUrl();
      const authToken = this.getAuthToken();

      if (!authToken) {
        return {
          success: false,
          error: "未配置同步认证令牌，请在设置中配置 promptManager.syncAuthToken",
          errorCode: "NO_AUTH_TOKEN",
        };
      }

      console.log("正在推送数据到远端...");

      // TODO: 实现实际的网络请求
      // VSCode扩展环境中需要使用适当的网络请求方式
      // 目前返回模拟成功结果
      return {
        success: false,
        error: "同步功能正在开发中，请稍后使用",
        errorCode: "NOT_IMPLEMENTED",
      };

      /*
      // 获取本地数据
      const localPrompts = await this.storageService.getPrompts();
      const localCategories = await this.storageService.getCategories();

      const localData: ExportData = {
        version: "1.0.0",
        exportedAt: new Date(),
        prompts: localPrompts,
        categories: localCategories,
        metadata: {
          totalCount: localPrompts.length,
          categoryCount: localCategories.length,
        },
      };

      const response = await fetch(`${serverUrl}/push`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
          "User-Agent": "PromptManager-VSCode",
        },
        body: JSON.stringify(localData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `推送失败: ${response.status} ${response.statusText}\n${errorText}`,
          errorCode: "PUSH_FAILED",
        };
      }

      const result = await response.json();

      console.log(`成功推送数据：${localPrompts.length}个提示词，${localCategories.length}个分类`);

      return {
        success: true,
        data: {
          promptsSynced: localPrompts.length,
          categoriesSynced: localCategories.length,
          action: "push",
        },
      };
      */
    } catch (error) {
      console.error("推送数据失败:", error);
      return {
        success: false,
        error: `网络错误: ${error instanceof Error ? error.message : "未知错误"}`,
        errorCode: "NETWORK_ERROR",
      };
    }
  }

  /**
   * 检查同步状态
   */
  async getSyncStatus(): Promise<{
    isConfigured: boolean;
    serverUrl: string;
    hasAuthToken: boolean;
    lastSyncTime?: Date;
  }> {
    const serverUrl = this.getSyncServerUrl();
    const authToken = this.getAuthToken();

    return {
      isConfigured: !!(serverUrl && authToken),
      serverUrl: serverUrl,
      hasAuthToken: !!authToken,
      lastSyncTime: undefined, // TODO: 可以从配置中读取上次同步时间
    };
  }
}