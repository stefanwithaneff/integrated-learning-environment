import * as vscode from "vscode";
import * as toml from "@iarna/toml";
import { LEARNME_FILENAME } from "./constants";
import { getContentForUri, getUriRelativeToConfig } from "./utils/fs";

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
          items.push(new CourseLesson(element.configUri, module, element));
        } else if (module.type === "submodule") {
          const { config, uri } = await this.getConfigForModule(
            element.configUri,
            module
          );
          items.push(new CourseSubmodule(uri, config, element));
        }
      }
      return items;
    }
    return [];
  }

  getParent(element: CourseItem): CourseItem | undefined {
    return element.parent;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  private async getConfigForModule(
    parentUri: vscode.Uri,
    module?: SubmoduleConfig
  ): Promise<{ config: CourseModule; uri: vscode.Uri }> {
    const uri = module
      ? getUriRelativeToConfig(parentUri, module.path, LEARNME_FILENAME)
      : vscode.Uri.joinPath(parentUri, LEARNME_FILENAME);
    try {
      const content = await getContentForUri(uri);
      const config = toml.parse(content) as any;
      return { config, uri };
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
  exerciseFilePaths?: string[];
  testFilePaths?: string[];
  testOutputPath?: string;
}

type ElementConfig = LessonConfig | SubmoduleConfig;

interface CourseModule {
  title: string;
  modules: ElementConfig[];
  testCommand?: string;
}

export abstract class CourseItem extends vscode.TreeItem {
  public parent?: CourseItem;

  constructor(
    public configUri: vscode.Uri,
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }
}

export class CourseLesson extends CourseItem {
  constructor(
    public configUri: vscode.Uri,
    public data: LessonConfig,
    public parent: CourseItem
  ) {
    super(configUri, data.title, vscode.TreeItemCollapsibleState.None);
  }
}

export class CourseSubmodule extends CourseItem {
  constructor(
    public configUri: vscode.Uri,
    public data: CourseModule,
    public parent?: CourseItem
  ) {
    super(configUri, data.title, vscode.TreeItemCollapsibleState.Collapsed);
  }
}
