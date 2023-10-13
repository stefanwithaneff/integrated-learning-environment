import * as vscode from "vscode";
import {
  getContentForUri,
  getUriRelativeToConfig,
  getUriRelativeToCourseItem,
} from "./utils/fs";
import {
  CourseItem,
  CourseLesson,
  CourseSubmodule,
  SubmoduleConfig,
  CourseModule,
} from "./course-data";
import { CourseDataProvider } from "./course-data-provider";

interface DirectoryElement {
  type: "directory";
  name: string;
  uri: vscode.Uri;
  contents: Map<string, ExerciseElement>;
}

interface FileElement {
  type: "file";
  name: string;
  uri: vscode.Uri;
}

type ExerciseElement = DirectoryElement | FileElement;

export class ExerciseFileProvider
  implements vscode.TreeDataProvider<ExerciseElement>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    ExerciseElement | undefined | null | void
  > = new vscode.EventEmitter<ExerciseElement | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    ExerciseElement | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private cachedFileTree: ExerciseElement[] = [];

  constructor(private lessonModuleTreeView: vscode.TreeView<CourseItem>) {}

  getTreeItem(element: ExerciseElement) {
    const item = new vscode.TreeItem(
      element.name,
      element.type === "directory"
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );

    item.iconPath = new vscode.ThemeIcon("file-code");

    return item;
  }

  async getChildren(element?: ExerciseElement): Promise<ExerciseElement[]> {
    const currentCourseItem = this.lessonModuleTreeView.selection.at(0);

    if (currentCourseItem instanceof CourseSubmodule) {
      return [];
    }

    if (currentCourseItem instanceof CourseLesson) {
      if (!element) {
        const tree = this.constructFileTree(currentCourseItem);
        this.cachedFileTree = tree;
        return tree;
      }

      if (element.type === "directory") {
        return Array.from(element.contents.values());
      } else {
        return [];
      }
    }

    return [];
  }

  getParent(element: ExerciseElement): ExerciseElement | undefined {
    const matchingRootElement = this.cachedFileTree.find((cachedElement) =>
      element.uri.path.includes(cachedElement.uri.path)
    );

    if (!matchingRootElement || matchingRootElement === element) {
      return;
    }

    const pathComponents = element.uri.path
      .slice(matchingRootElement.uri.path.length)
      .split("/")
      .slice(0, -1);

    let matchingElement: ExerciseElement | undefined = matchingRootElement;
    for (const component of pathComponents) {
      if (!matchingElement || matchingElement.type !== "directory") {
        return;
      }
      matchingElement = matchingElement.contents.get(component);
    }
    return matchingElement;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  private constructFileTree(lesson: CourseLesson): ExerciseElement[] {
    const exerciseFilePaths = lesson.data.exerciseFilePaths ?? [];

    if (exerciseFilePaths.length === 0) {
      return [];
    }

    const exerciseUris = exerciseFilePaths.map((path) =>
      getUriRelativeToCourseItem(lesson, path)
    );
    const commonUriRoot = this.getCommonUriRoot(exerciseUris);
    const exerciseElementPaths = exerciseUris.map((uri) =>
      uri.path.slice(commonUriRoot.path.length)
    );

    const rootElement: ExerciseElement = {
      type: "directory",
      name: "root",
      uri: commonUriRoot,
      contents: new Map(),
    };

    for (const elementPath of exerciseElementPaths) {
      const pathComponents = elementPath.split("/");

      for (const component of pathComponents) {
        this.createExerciseElement(component.split("/"), rootElement);
      }
    }

    return Array.from(rootElement.contents.values());
  }

  private getCommonUriRoot(uris: vscode.Uri[]): vscode.Uri {
    const uriPaths = uris.map((uri) => uri.path);

    let commonPath: string | undefined;
    // Find the common path among all URIs
    for (const path of uriPaths) {
      if (!commonPath) {
        commonPath = path.split("/").slice(0, -1).join("/") + "/";
      } else {
        let i = 0;
        for (; i < commonPath.length && i < path.length; i++) {
          if (commonPath.at(i) !== path.at(i)) {
            break;
          }
        }

        commonPath = commonPath.slice(0, i);
      }
    }

    const baseUri = uris[0];

    return baseUri.with({ path: commonPath });
  }

  private createExerciseElement(
    elementPath: string[],
    rootElement: ExerciseElement
  ): void {
    if (rootElement.type !== "directory") {
      return;
    }

    const [currentComponent, ...pathComponents] = elementPath;

    if (pathComponents.length === 0) {
      rootElement.contents.set(currentComponent, {
        type: "file",
        name: currentComponent,
        uri: vscode.Uri.joinPath(rootElement.uri, currentComponent),
      });
      return;
    }

    const currentElement = rootElement.contents.get(currentComponent) ?? {
      type: "directory",
      name: currentComponent,
      uri: vscode.Uri.joinPath(rootElement.uri, currentComponent + "/"),
      contents: new Map(),
    };

    if (currentElement.type === "directory") {
      this.createExerciseElement(pathComponents, currentElement);
    }

    rootElement.contents.set(currentComponent, currentElement);

    return;
  }
}
