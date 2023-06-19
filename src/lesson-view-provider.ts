import * as vscode from "vscode";
import { EXTENSION_NAMESPACE } from "./constants";

export class LessonViewProvider {
  webviewPanel: vscode.WebviewPanel | undefined;

  private createWebview(): vscode.WebviewPanel {
    this.webviewPanel = vscode.window.createWebviewPanel(
      EXTENSION_NAMESPACE,
      "Integrated Learning Environment",
      vscode.ViewColumn.Two
    );

    this.webviewPanel.onDidDispose(() => {
      this.webviewPanel = undefined;
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
