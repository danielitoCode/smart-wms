/** Shared types for TaskWidget (kept outside .svelte for clean type imports). */

export interface Subtask {
	id: string;
	title: string;
	completed: boolean;
}

export interface Assignee {
	name: string;
	avatar: string;
	/** Optional chip background (CSS value) */
	color?: string;
}

export interface TaskData {
	title: string;
	progress: number;
	completedCount: number;
	totalCount: number;
	priority: string;
	status: string;
	subtasks: Subtask[];
	assignees: Assignee[];
}
