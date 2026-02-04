import fs from 'fs';
import path from 'path';

// 版本信息接口
export interface VersionInfo {
  version: string;
  lastUpdated: string;
  description: string;
  changes: string[];
  files: {
    name: string;
    version: string;
    lastUpdated: string;
  }[];
}

// 版本管理器类
export class VersionManager {
  private kbPath: string;
  private versionPath: string;

  constructor(kbPath: string) {
    this.kbPath = kbPath;
    this.versionPath = path.join(kbPath, 'meta', 'version.json');
  }

  // 获取当前版本信息
  public getCurrentVersion(): VersionInfo | null {
    try {
      if (fs.existsSync(this.versionPath)) {
        const versionContent = fs.readFileSync(this.versionPath, 'utf8');
        return JSON.parse(versionContent);
      }
      return null;
    } catch (error) {
      console.error('获取版本信息失败:', error);
      return null;
    }
  }

  // 检查是否有更新
  public async checkForUpdates(): Promise<boolean> {
    try {
      // 从远程获取最新版本信息
      const response = await fetch('/meta/version.json');
      if (!response.ok) {
        throw new Error('获取远程版本信息失败');
      }
      
      const remoteVersion = await response.json();
      const currentVersion = this.getCurrentVersion();

      // 比较版本号
      if (!currentVersion) {
        return true; // 如果本地没有版本信息，认为有更新
      }

      // 简单的版本号比较（仅适用于 x.y.z 格式）
      const compareVersions = (v1: string, v2: string): number => {
        const v1Parts = v1.split('.').map(Number);
        const v2Parts = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
          const v1Part = v1Parts[i] || 0;
          const v2Part = v2Parts[i] || 0;

          if (v1Part > v2Part) return 1;
          if (v1Part < v2Part) return -1;
        }

        return 0;
      };

      return compareVersions(currentVersion.version, remoteVersion.version) < 0;
    } catch (error) {
      console.error('检查更新失败:', error);
      return false;
    }
  }

  // 更新知识库
  public async updateKnowledgeBase(): Promise<boolean> {
    try {
      // 获取远程版本信息
      const versionResponse = await fetch('/meta/version.json');
      if (!versionResponse.ok) {
        throw new Error('获取远程版本信息失败');
      }
      
      const remoteVersion = await versionResponse.json();

      // 更新各个文件
      for (const fileInfo of remoteVersion.files) {
        const filePath = path.join(this.kbPath, fileInfo.name);
        const fileUrl = `/${fileInfo.name}`;

        // 下载文件
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
          throw new Error(`下载文件 ${fileInfo.name} 失败`);
        }

        const fileContent = await fileResponse.text();

        // 确保目录存在
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        // 写入文件
        fs.writeFileSync(filePath, fileContent);
      }

      // 更新版本信息
      const metaDir = path.join(this.kbPath, 'meta');
      if (!fs.existsSync(metaDir)) {
        fs.mkdirSync(metaDir, { recursive: true });
      }

      fs.writeFileSync(this.versionPath, JSON.stringify(remoteVersion, null, 2));

      return true;
    } catch (error) {
      console.error('更新知识库失败:', error);
      return false;
    }
  }

  // 创建版本信息
  public createVersionInfo(version: string, description: string, changes: string[]): VersionInfo {
    const files = [
      { name: 'standards_master.json', version, lastUpdated: new Date().toISOString() },
      { name: 'rules_mapping.json', version, lastUpdated: new Date().toISOString() },
      { name: 'semantic_descriptions.md', version, lastUpdated: new Date().toISOString() }
    ];

    const versionInfo: VersionInfo = {
      version,
      lastUpdated: new Date().toISOString(),
      description,
      changes,
      files
    };

    // 确保目录存在
    const metaDir = path.join(this.kbPath, 'meta');
    if (!fs.existsSync(metaDir)) {
      fs.mkdirSync(metaDir, { recursive: true });
    }

    // 写入版本信息
    fs.writeFileSync(this.versionPath, JSON.stringify(versionInfo, null, 2));

    return versionInfo;
  }

  // 从远程获取版本信息
  public async getRemoteVersion(): Promise<VersionInfo | null> {
    try {
      const response = await fetch('/meta/version.json');
      if (!response.ok) {
        throw new Error('获取远程版本信息失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取远程版本信息失败:', error);
      return null;
    }
  }
}

// 版本管理器工厂函数
export const createVersionManager = (kbPath: string) => {
  return new VersionManager(kbPath);
};
