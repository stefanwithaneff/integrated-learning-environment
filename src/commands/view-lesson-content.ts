import * as util from "util";
import * as vscode from "vscode";
import * as MarkdownIt from "markdown-it";
import {
  CourseItem,
  CourseLesson,
  CourseSubmodule,
} from "../course-data-provider";
import { LessonViewProvider } from "../lesson-view-provider";

const markdownRenderer = new MarkdownIt();

export const viewLessonContentCommandFactory = (
  viewProvider: LessonViewProvider
) => {
  return async function viewLessonContent(item: CourseItem) {
    const lessonView = viewProvider.getLessonView();

    if (item instanceof CourseLesson) {
      // Load the lesson content from file
      const contentUri = vscode.Uri.joinPath(
        item.configUri,
        "..",
        item.data.contentPath
      );
      const lessonContent = await vscode.workspace.fs.readFile(contentUri);
      const contentString = new util.TextDecoder("utf-8").decode(lessonContent);

      if (item.data.contentType === "markdown") {
        const html = markdownRenderer.render(contentString);

        lessonView.title = item.data.title;
        lessonView.webview.html = html;
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
