import * as vscode from "vscode";
import { EXTENSION_NAMESPACE } from "./constants";
import { CourseItem } from "./course-data";
import { runTestsForCourseItem } from "./run-tests-for-course-item";

export class LessonViewProvider {
  webviewPanel: vscode.WebviewPanel | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly lessonModuleTreeView: vscode.TreeView<CourseItem>
  ) {}

  private createWebview(): vscode.WebviewPanel {
    this.webviewPanel = vscode.window.createWebviewPanel(
      EXTENSION_NAMESPACE,
      "Integrated Learning Environment",
      vscode.ViewColumn.Two,
      { enableScripts: true, enableCommandUris: true }
    );

    this.webviewPanel.onDidDispose(() => {
      this.webviewPanel = undefined;
    });

    this.webviewPanel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "test":
          const courseItem = this.lessonModuleTreeView.selection.at(0);
          if (!courseItem) {
            return;
          }
          const results = await runTestsForCourseItem(this.context, courseItem);
          this.webviewPanel?.webview.postMessage({
            type: "TEST_RESULTS",
            payload: results,
          });
          return;
      }
    });

    return this.webviewPanel;
  }

  getLessonView(): vscode.WebviewPanel {
    if (!this.webviewPanel) {
      return this.createWebview();
    }
    return this.webviewPanel;
  }
}
