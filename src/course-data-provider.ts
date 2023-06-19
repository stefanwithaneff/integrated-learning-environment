import * as util from "util";

import * as vscode from "vscode";
import * as toml from "@iarna/toml";
import { LEARNME_FILENAME } from "./constants";

export class CourseDataProvider implements vscode.TreeDataProvider<CourseItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    CourseItem | undefined | null | void
  > = new vscode.EventEmitter<CourseItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    CourseItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  constructor(private workspaceFolders: readonly vscode.WorkspaceFolder[]) {}

  getTreeItem(element: CourseItem) {
    return element;
  }

  async getChildren(element?: CourseItem): Promise<CourseItem[]> {
    if (!element) {
      const items: CourseItem[] = [];
      for (const folder of this.workspaceFolders) {
        const { config, uri } = await this.getConfigForModule(folder.uri);
        items.push(this.convertRootModuleConfigToCourseItem(uri, config));
      }
      return items;
    }

    if (element instanceof CourseLesson) {
      return [];
    }

    if (element instanceof CourseSubmodule) {
      const items: CourseItem[] = [];
      for (const module of element.data.modules) {
        if (module.type === "lesson") {
          items.push(new CourseLesson(element.configUri, module));
        } else if (module.type === "submodule") {
          const submoduleUri = vscode.Uri.joinPath(
            element.configUri,
            "..",
            module.path
          );
          const { config, uri } = await this.getConfigForModule(submoduleUri);
          items.push(new CourseSubmodule(uri, config));
        }
      }
      return items;
    }
    return [];
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  private async getConfigForModule(
    uri: vscode.Uri
  ): Promise<{ config: CourseModule; uri: vscode.Uri }> {
    const configUri = vscode.Uri.joinPath(uri, LEARNME_FILENAME);
    try {
      const configContents = await vscode.workspace.fs.readFile(configUri);
      const configStr = new util.TextDecoder("utf-8").decode(configContents);
      const config = toml.parse(configStr) as any;
      return { config, uri: configUri };
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  private convertRootModuleConfigToCourseItem(
    uri: vscode.Uri,
    config: CourseModule
  ): CourseSubmodule {
    return new CourseSubmodule(uri, config);
  }
}

export interface SubmoduleConfig {
  type: "submodule";
  title: string;
  path: string;
}

export interface LessonConfig {
  type: "lesson";
  title: string;
  contentType: string;
  contentPath: string;
  exerciseFilePaths: string;
  testFilter: string;
}

type ElementConfig = LessonConfig | SubmoduleConfig;

interface CourseModule {
  title: string;
  modules: ElementConfig[];
}

export class CourseItem extends vscode.TreeItem {}

export class CourseLesson extends CourseItem {
  constructor(public configUri: vscode.Uri, public data: LessonConfig) {
    super(data.title, vscode.TreeItemCollapsibleState.None);
  }
}

export class CourseSubmodule extends CourseItem {
  constructor(public configUri: vscode.Uri, public data: CourseModule) {
    super(data.title, vscode.TreeItemCollapsibleState.Collapsed);
  }
}