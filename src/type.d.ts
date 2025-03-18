// src/type.d.ts
declare global {
    interface Window {
        solana: any;
        tronWeb: any;
        ethereum: any;
    }
}

export {}; // 确保文件被视为模块
