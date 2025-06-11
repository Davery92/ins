export declare class FileStorageService {
    static uploadFile(fileBuffer: Buffer, fileName: string, contentType: string, userId: string, customerId?: string): Promise<{
        key: string;
        url: string;
    }>;
    static getFileUrl(key: string): Promise<string>;
    static deleteFile(key: string): Promise<void>;
    static getFileBuffer(key: string): Promise<Buffer>;
}
export declare const initializeStorage: () => Promise<void>;
//# sourceMappingURL=fileStorage.d.ts.map