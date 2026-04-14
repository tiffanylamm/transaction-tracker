export type Status = "Completed" | "Refunding" | "Owed";

export const STATUSES: Status[] = ["Completed", "Owed", "Refunding"];

export const UPDATABLE_FIELDS = ["date", "description", "category", "amount", "status", "source", "parentId"] as const;

export type Category = string

export type SortDirection = 'asc' | 'desc'

export interface Transaction {
    id: string
    date: string //YYY-MM-DD
    description: string
    category: Category | null
    amount: number //pos = income, neg = expense
    status: Status
    source: string | null
    createdAt: number //timestamp since never displayed
    isGroup: boolean
    parentId: string | null
    childCount?: number
}

export interface SortConfig {
    key: keyof Transaction
    direction: SortDirection
}

export interface PaginatedResponse {
    data: Transaction[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
}

