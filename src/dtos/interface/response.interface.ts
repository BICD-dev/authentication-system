export interface ApiErrorDetail {
    field?: string;
    message: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    statusCode: number;
    message: string;
    data?: T;
    errors?: ApiErrorDetail[];
}

// Backward-compatible alias for code that still imports IResponse.
export type IResponse<T = unknown> = ApiResponse<T>;
