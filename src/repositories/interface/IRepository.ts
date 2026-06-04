export interface IRepository<T, CreateInput, UpdateInput> {
  create(data: CreateInput): Promise<T>;
  findById(id: string): Promise<T | null>;
  update(id: string, data: UpdateInput): Promise<T>;
  delete(id: string): Promise<void>;
} 