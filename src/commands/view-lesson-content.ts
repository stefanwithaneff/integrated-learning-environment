import * as util from "util";
import * as vscode from "vscode";
import * as MarkdownIt from "markdown-it";
import {
  CourseItem,
  CourseLesson,
  CourseSubmodule,
} from "../course-data-provider";
import { LessonViewProvider } from "../lesson-view-provider";
import {
  getContentRelativeToConfig,
  getUriRelativeToConfig,
} from "../utils/fs";

const markdownRenderer = new MarkdownIt();

export const viewLessonContentCommandFactory = (
  viewProvider: LessonViewProvider
) => {
  function getAllOpenTabs() {
    return vscode.window.tabGroups.all.map((tabGroup) => tabGroup.tabs).flat();
  }

  async function clearView() {
    const openTabs = getAllOpenTabs();

    for (const tab of openTabs) {
      if (tab.input) {
        console.log((tab.input as any).constructor.name);
      }
    }
  }

  return async function viewLessonContent(item: CourseItem) {
    const lessonView = viewProvider.getLessonView();

    if (item instanceof CourseLesson) {
      clearView();

      // Load the lesson content from file
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

      // Open exercise files
      for (const path of item.data.exerciseFilePaths ?? []) {
        const textDocument = await vscode.workspace.openTextDocument(
          getUriRelativeToConfig(item.configUri, path)
        );
        await vscode.window.showTextDocument(textDocument, {
          preview: false, // Prevents the individual files from overriding each other
          viewColumn: vscode.ViewColumn.One,
        });
      }
    }

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
    }
  };
};
