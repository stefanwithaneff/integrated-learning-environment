import * as MarkdownIt from "markdown-it";
import * as vscode from "vscode";
import {
  CourseItem,
  CourseLesson,
  CourseSubmodule,
} from "./course-data-provider";
import { LessonViewProvider } from "./lesson-view-provider";
import {
  getContentRelativeToConfig,
  getUriRelativeToConfig,
  saveAllOpenTextDocuments,
} from "./utils/fs";

const markdownRenderer = new MarkdownIt();

export class LessonRenderer {
  private currentCourseItemTextDocuments: vscode.TextDocument[] = [];

  constructor(private readonly lessonViewProvider: LessonViewProvider) {}

  async viewLessonContent(item: CourseItem): Promise<void> {
    // Save all open text editors
    await saveAllOpenTextDocuments();
    // Open all new exercise files
    this.currentCourseItemTextDocuments = await this.openExerciseFiles(item);
    // Close all unrelated tabs
    await this.closeUnrelatedTabs();
    // Ensure webview is visible in column One/Two (depending on exercise file presence)
    this.openLessonView(item);
    // Render webview content
    await this.renderLessonContent(item);
    // Ensure focus on first exercise file text editor (if applicable)
    await this.focusOnPrimaryLessonContent(item);
  }

  private getAllOpenTabs(): vscode.Tab[] {
    return vscode.window.tabGroups.all.map((tabGroup) => tabGroup.tabs).flat();
  }

  private hasExerciseFiles(item: CourseItem): item is CourseLesson {
    return (
      item instanceof CourseLesson &&
      item.data.exerciseFilePaths &&
      item.data.exerciseFilePaths.length > 0
    );
  }

  private async openExerciseFile(
    item: CourseLesson,
    path: string
  ): Promise<vscode.TextDocument> {
    const textDocument = await vscode.workspace.openTextDocument(
      getUriRelativeToConfig(item.configUri, path)
    );

    await this.openExerciseFileWithTextDocument(textDocument);

    return textDocument;
  }

  private async openExerciseFileWithTextDocument(
    doc: vscode.TextDocument
  ): Promise<vscode.TextEditor> {
    return vscode.window.showTextDocument(doc, {
      preview: false, // Prevents the individual files from overriding each other
      preserveFocus: false,
      viewColumn: vscode.ViewColumn.One,
    });
  }

  private async openExerciseFiles(
    item: CourseItem
  ): Promise<vscode.TextDocument[]> {
    if (!this.hasExerciseFiles(item)) {
      return [];
    }

    return Promise.all(
      item.data.exerciseFilePaths.map((path) =>
        this.openExerciseFile(item, path)
      )
    );
  }

  private async closeUnrelatedTabs() {
    const openTabs = this.getAllOpenTabs();

    for (const tab of openTabs) {
      if (!this.isRelatedTab(tab)) {
        try {
          await vscode.window.tabGroups.close(tab);
        } catch (e) {
          console.log(
            `Error encountered with tab: ${tab.label} ${(tab as any).viewType}`
          );
          console.error(e);
        }
      }
    }
  }

  private isRelatedTab(tab: vscode.Tab) {
    const tabInput = tab.input;

    if (tabInput instanceof vscode.TabInputText) {
      // True if the tab is an exercise file for the current course item
      return this.currentCourseItemTextDocuments.some(
        (doc) => doc.uri.toString() === tabInput.uri.toString()
      );
    }

    if (tabInput instanceof vscode.TabInputWebview) {
      // True if the tab is the webview for this plugin
      return (
        this.lessonViewProvider.webviewPanel?.viewType &&
        tabInput.viewType.includes(
          this.lessonViewProvider.webviewPanel.viewType
        )
      );
    }

    return false;
  }

  private openLessonView(item: CourseItem) {
    const lessonView = this.lessonViewProvider.getLessonView();

    if (!this.hasExerciseFiles(item)) {
      lessonView.reveal(vscode.ViewColumn.One);
    } else {
      lessonView.reveal(vscode.ViewColumn.Two);
    }
  }

  private async renderLessonContent(item: CourseItem): Promise<void> {
    const lessonView = this.lessonViewProvider.getLessonView();

    if (item instanceof CourseSubmodule) {
      const html = `
        <html>
          <body>
            <h1>${item.data.title}</h1>
            <ol>
              ${item.data.modules
                .map((module) => `<li>${module.title}</li>`)
                .join("\n")}
            </ol>
          </body>
        </html>
      `;

      lessonView.title = item.data.title;
      lessonView.webview.html = html;
    } else if (item instanceof CourseLesson) {
      if (item.data.contentPath) {
        const { content } = await getContentRelativeToConfig(
          item.configUri,
          item.data.contentPath
        );

        if (item.data.contentType === "markdown") {
          const html = markdownRenderer.render(content);

          lessonView.title = item.data.title;
          lessonView.webview.html = html;
        }
      }
    }
  }

  private async focusOnPrimaryLessonContent(item: CourseItem) {
    if (this.hasExerciseFiles(item)) {
      await this.openExerciseFileWithTextDocument(
        this.currentCourseItemTextDocuments[0]
      );
    }
  }
}
