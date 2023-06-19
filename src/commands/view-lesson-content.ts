import * as util from "util";
import * as vscode from "vscode";
import * as MarkdownIt from "markdown-it";
import {
  CourseItem,
  CourseLesson,
  CourseSubmodule,
} from "../course-data-provider";
import { LessonViewProvider } from "../lesson-view-provider";
import { getContentRelativeToConfig } from "../utils/fs";

const markdownRenderer = new MarkdownIt();

export const viewLessonContentCommandFactory = (
  viewProvider: LessonViewProvider
) => {
  return async function viewLessonContent(item: CourseItem) {
    const lessonView = viewProvider.getLessonView();

    if (item instanceof CourseLesson) {
      // Load the lesson content from file
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
