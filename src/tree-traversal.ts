import { CourseItem, CourseSubmodule } from "./course-data";
import { CourseDataProvider } from "./course-data-provider";

function resolveNextItemRelativeToSiblings(
  children: CourseItem[],
  courseItem: CourseItem
): CourseItem | undefined {
  if (children.length === 0) {
    return;
  }

  const courseItemIndex = children.findIndex(
    (item) => item.label === courseItem.label
  );

  if (courseItemIndex === children.length - 1) {
    return;
  }

  return children.at(courseItemIndex + 1);
}

export async function getNextCourseItem(
  provider: CourseDataProvider,
  courseItem?: CourseItem,
  childItem?: CourseItem
): Promise<CourseItem | undefined> {
  if (!courseItem) {
    const children = await provider.getChildren();
    if (childItem) {
      return resolveNextItemRelativeToSiblings(children, childItem);
    }
    return children.at(0);
  } else {
    if (courseItem instanceof CourseSubmodule) {
      const children = await provider.getChildren(courseItem);
      const nextItem = childItem
        ? resolveNextItemRelativeToSiblings(children, childItem)
        : children.at(0);

      return (
        nextItem ?? getNextCourseItem(provider, courseItem.parent, courseItem)
      );
    } else {
      const children = await provider.getChildren(courseItem.parent);
      const nextItem = resolveNextItemRelativeToSiblings(children, courseItem);

      return (
        nextItem ?? getNextCourseItem(provider, courseItem.parent, courseItem)
      );
    }
  }
}

function resolvePreviousItemRelativeToSiblings(
  children: CourseItem[],
  courseItem: CourseItem
): CourseItem | undefined {
  if (children.length === 0) {
    return;
  }

  const courseItemIndex = children.findIndex(
    (item) => item.label === courseItem.label
  );

  if (courseItemIndex <= 0) {
    return;
  }

  return children.at(courseItemIndex - 1);
}

async function getFinalDescendentItem(
  provider: CourseDataProvider,
  courseItem: CourseItem
): Promise<CourseItem | undefined> {
  if (courseItem instanceof CourseSubmodule) {
    const children = await provider.getChildren(courseItem);

    if (children.length === 0) {
      return;
    }

    const lastChild = children.at(-1);

    if (!lastChild) {
      return;
    }

    return getFinalDescendentItem(provider, lastChild);
  }
  return courseItem;
}

export async function getPreviousCourseItem(
  provider: CourseDataProvider,
  courseItem?: CourseItem,
  childItem?: CourseItem
): Promise<CourseItem | undefined> {
  if (!courseItem) {
    return;
  } else {
    if (courseItem instanceof CourseSubmodule) {
      const children = await provider.getChildren(courseItem);
      const previousItem = childItem
        ? resolvePreviousItemRelativeToSiblings(children, childItem)
        : undefined;

      if (previousItem) {
        return getFinalDescendentItem(provider, previousItem);
      } else {
        return getPreviousCourseItem(provider, courseItem.parent, courseItem);
      }
    } else {
      const children = await provider.getChildren(courseItem.parent);
      const previousItem = resolvePreviousItemRelativeToSiblings(
        children,
        courseItem
      );

      return previousItem ?? courseItem.parent;
    }
  }
}
