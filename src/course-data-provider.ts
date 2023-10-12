import * as vscode from "vscode";
import * as toml from "@iarna/toml";
import { LEARNME_FILENAME } from "./constants";
import { getContentForUri, getUriRelativeToConfig } from "./utils/fs";
import {
  CourseItem,
  CourseLesson,
  CourseSubmodule,
  SubmoduleConfig,
  CourseModule,
} from "./course-data";

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
      for (const module of element.data.modules ?? []) {
        if (module.type === "lesson") {
          const lesson = new CourseLesson(element.configUri, module, element);
          await lesson.loadLessonStatus();
          items.push(lesson);
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
