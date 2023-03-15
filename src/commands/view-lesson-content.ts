import * as vscode from "vscode";
import {
  CourseItem,
  CourseLesson,
  CourseSubmodule,
} from "../course-data-provider";
import { LessonViewProvider } from "../lesson-view-provider";

export const viewLessonContentCommandFactory = (
  viewProvider: LessonViewProvider
) => {
  return async function viewLessonContent(item: CourseItem) {
    const lessonView = viewProvider.getLessonView();

    if (item instanceof CourseLesson) {
      // Do stuff I guess
    }

    if (item instanceof CourseSubmodule) {
      const html = `
        <html>
          <body>
            <h1>${item.data.title}</h1>
            <ol>
              ${item.data.modules.map((module) => `<li>${module.title}</li>`)}
            </ol>
          </body>
        </html>
      `;

      lessonView.title = item.data.title;
      lessonView.webview.html = html;
    }
  };
};
