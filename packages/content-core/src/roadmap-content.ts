export type RoadmapItemStatus = "todo" | "in_progress" | "done";

export type RoadmapPriority = "high" | "medium" | "low";

export interface RoadmapContentItem {
  id: string;
  title: string;
  description?: string;
  details?: string;
  status: RoadmapItemStatus;
  priority: RoadmapPriority;
  deadline?: string;
  completedAt?: string;
}

export interface RoadmapProgress {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
}

function stripTaskListHeading(content: string): string {
  const filteredLines = content
    .split(/\r?\n/)
    .filter((line) => !/^(#{1,6}\s*)?任务列表[:：]?\s*$/.test(line.trim()));

  return filteredLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function parseRoadmapItemsFromContent(content: string): { items: RoadmapContentItem[]; remainingContent: string } {
  const lines = content.split(/\r?\n/);
  const items: RoadmapContentItem[] = [];
  const nonTaskLines: string[] = [];

  let currentItem: RoadmapContentItem | null = null;
  let currentDescription: string[] = [];
  let currentDetails: string[] = [];
  let isCollectingDetails = false;
  let inFence = false;
  let fenceChar = "";
  let itemId = 1;

  const taskRegex = /^[-*+]\s*\[([ xX-])\]\s+(.+?)(?:\s+`(high|medium|low)`)?\s*$/;
  const indentRegex = /^(\s{2,})(.+)$/;
  const deadlineRegex = /^截止[:：]\s*(.+)$/;
  const completedAtRegex = /^完成[:：]\s*(.+)$/;
  const descriptionLabelRegex = /^描述[:：]\s*(.*)$/;
  const detailsLabelRegex = /^详情[:：]\s*(.*)$/;

  const saveCurrentItem = () => {
    if (!currentItem) return;
    if (currentDescription.length > 0) currentItem.description = currentDescription.join("\n").trim();
    if (currentDetails.length > 0) currentItem.details = currentDetails.join("\n").trim();
    items.push(currentItem);
    currentItem = null;
    currentDescription = [];
    currentDetails = [];
    isCollectingDetails = false;
  };

  const appendNonTaskLine = (line: string) => {
    if (currentItem) saveCurrentItem();
    nonTaskLines.push(line);
  };

  for (const line of lines) {
    const trimmedLine = line.trimStart();
    const fenceMatch = trimmedLine.match(/^(`{3,}|~{3,})/);

    if (fenceMatch) {
      const currentFenceChar = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = currentFenceChar;
      } else if (currentFenceChar === fenceChar) {
        inFence = false;
        fenceChar = "";
      }
      appendNonTaskLine(line);
      continue;
    }

    if (inFence) {
      appendNonTaskLine(line);
      continue;
    }

    const taskMatch = line.match(taskRegex);
    if (taskMatch) {
      saveCurrentItem();
      const [, checkbox, title, priority] = taskMatch;
      const normalizedCheckbox = checkbox.toLowerCase();
      let status: RoadmapItemStatus = "todo";
      if (normalizedCheckbox === "x") status = "done";
      else if (normalizedCheckbox === "-") status = "in_progress";

      currentItem = {
        id: String(itemId++),
        title: title.trim(),
        status,
        priority: (priority as RoadmapPriority) || "medium",
      };
      continue;
    }

    if (!currentItem) {
      nonTaskLines.push(line);
      continue;
    }

    const indentMatch = line.match(indentRegex);
    if (!indentMatch) {
      saveCurrentItem();
      nonTaskLines.push(line);
      continue;
    }

    const text = indentMatch[2];
    const deadlineMatch = text.match(deadlineRegex);
    const completedAtMatch = text.match(completedAtRegex);
    if (deadlineMatch) {
      currentItem.deadline = deadlineMatch[1].trim();
      isCollectingDetails = false;
      continue;
    }
    if (completedAtMatch) {
      currentItem.completedAt = completedAtMatch[1].trim();
      isCollectingDetails = false;
      continue;
    }

    const descriptionLabelMatch = text.match(descriptionLabelRegex);
    if (descriptionLabelMatch) {
      const descriptionLine = descriptionLabelMatch[1].trim();
      if (descriptionLine) currentDescription.push(descriptionLine);
      isCollectingDetails = false;
      continue;
    }

    const detailsLabelMatch = text.match(detailsLabelRegex);
    if (detailsLabelMatch) {
      const detailsLine = detailsLabelMatch[1].trim();
      if (detailsLine) currentDetails.push(detailsLine);
      isCollectingDetails = true;
      continue;
    }

    if (text.trim() === "") {
      if (isCollectingDetails && currentDetails.length > 0) currentDetails.push("");
      else if (currentDescription.length > 0) currentDescription.push("");
      continue;
    }

    if (isCollectingDetails) currentDetails.push(text);
    else currentDescription.push(text);
  }

  saveCurrentItem();
  const rawRemainingContent = nonTaskLines.join("\n").trim();

  return {
    items,
    remainingContent: items.length > 0 ? stripTaskListHeading(rawRemainingContent) : rawRemainingContent,
  };
}

export function calculateRoadmapProgress(items: ReadonlyArray<Pick<RoadmapContentItem, "status">>): RoadmapProgress {
  return {
    total: items.length,
    done: items.filter((item) => item.status === "done").length,
    inProgress: items.filter((item) => item.status === "in_progress").length,
    todo: items.filter((item) => item.status === "todo").length,
  };
}
