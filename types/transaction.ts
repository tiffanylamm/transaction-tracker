export type Status = "Completed" | "Refunding" | "Owed";

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
}

export interface SortConfig {
    key: keyof Transaction 
    direction: SortDirection
}

