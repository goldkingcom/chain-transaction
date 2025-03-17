import Web3WalletConnector from './Web3WalletConnector'
import CryptoJS from 'crypto-js'
import HttpClient from './HttpClient'
import {JsonRpc} from 'eosjs'
import {encode} from 'js-base64'

// 配置常量
const API_CONFIG = {
    CHAIN_API: 'https://chain.amaxtest.com',
    PROXY_API: 'https://testnet.truedex.io/proxy',
    DEFAULT_DELAY: 3000,
}

// 链类型定义
type ChainType = 'eth' | 'bsc' | 'avalanche' | 'solana' | 'tron'

// 策略模式接口
interface ChainStrategy {
    connect(): Promise<string>
    signMessage(message: string): Promise<string>
    getParams(address: string, chainName: string): Promise<any>
}

// 策略工厂
class ChainStrategyFactory {
    static getStrategy(chainName: ChainType): ChainStrategy {
        const strategies: Record<ChainType, ChainStrategy> = {
            eth: new EthereumStrategy(),
            bsc: new BSCStrategy(),
            avalanche: new AvalancheStrategy(),
            solana: new SolanaStrategy(),
            tron: new TronStrategy(),
        }
        return strategies[chainName]
    }
}

// 基础策略类
abstract class BaseChainStrategy implements ChainStrategy {
    abstract connect(): Promise<string>
    abstract signMessage(message: string): Promise<string>

    async getParams(address: string, chainName: string): Promise<any> {
        const signMsg = await this.signMessage(address)
        return {
            body: {
                address,
                signature: signMsg,
                ...(chainName !== 'solana' && {hash_type: 'keccak'}),
                base_chain: chainName === 'solana' ? 'sol' : chainName,
            },
            ts: Date.now(),
        }
    }
}

// 各链具体策略
class EthereumStrategy extends BaseChainStrategy {
    async connect() {
        return Web3WalletConnector.connectEthereum()
    }
    async signMessage(message: string) {
        return Web3WalletConnector.signMessageEthereum(message)
    }
}

class BSCStrategy extends BaseChainStrategy {
    async connect() {
        return Web3WalletConnector.connectBSC()
    }
    async signMessage(message: string) {
        return Web3WalletConnector.signMessageEthereum(message)
    }
}

class AvalancheStrategy extends BaseChainStrategy {
    async connect() {
        return Web3WalletConnector.connectAvalanche()
    }
    async signMessage(message: string) {
        return Web3WalletConnector.signMessageAvalanche(message)
    }
}

class SolanaStrategy extends BaseChainStrategy {
    async connect() {
        return Web3WalletConnector.connectSolana()
    }
    async signMessage(message: string) {
        return Web3WalletConnector.signMessageSolana(message)
    }
}

class TronStrategy extends BaseChainStrategy {
    async connect() {
        return Web3WalletConnector.connectTron()
    }
    async signMessage(message: string) {
        return Web3WalletConnector.signMessageTron(message)
    }
}

class chainTransaction {
    private static apiClient = new HttpClient(API_CONFIG.CHAIN_API)
    private static proxyClient = new HttpClient(API_CONFIG.PROXY_API)

    static async loginByChain(chainName: ChainType): Promise<any | null> {
        try {
            const strategy = ChainStrategyFactory.getStrategy(chainName)
            const address = await strategy.connect()
            const accountInfo = await this.getAccount(address)

            if (!accountInfo) {
                const params = await strategy.getParams(address, chainName)
                const result = await this.bindAccount(params)

                if (result === 'success') {
                    await this.sleep(API_CONFIG.DEFAULT_DELAY)
                    return this.formatAccountInfo(await this.getAccount(address), chainName)
                }
                return null
            }
            return this.formatAccountInfo(accountInfo, chainName)
        } catch (error) {
            console.error(`Login failed for ${chainName}:`, error)
            return null
        }
    }

    static async transactByChain(
        chainName: ChainType,
        address: string,
        contract: string,
        action: string,
        paramsData: any
    ): Promise<string | null> {
        try {
            const accountInfo = await this.getAccount(address)
            if (!accountInfo) throw new Error('Account not found')

            const txnpackedParams = {
                txns: [
                    {
                        contract,
                        action,
                        data: await this.serializeTransactionData({
                            contract,
                            action,
                            data: paramsData,
                        }),
                    },
                ],
                nonce: accountInfo.nonce,
            }
            const txnpacked = {
                txns: [
                    {
                        contract,
                        action,
                        data: paramsData,
                    },
                ],
                nonce: accountInfo.nonce,
            }
            const signMessageData = await this.signTransaction(chainName, JSON.stringify(txnpacked))
            const responseData = await this.pushTransaction(
                chainName,
                address,
                txnpackedParams,
                txnpacked,
                signMessageData
            )

            return Number(responseData.code) === 200 ? 'success' : 'error'
        } catch (error) {
            console.error(`Transaction failed for ${chainName}:`, error)
            return 'error'
        }
    }

    private static async signTransaction(chainName: ChainType, message: string): Promise<string> {
        const strategies: Record<ChainType, () => Promise<string>> = {
            solana: () => Web3WalletConnector.signMessageSolana(message),
            tron: () => Web3WalletConnector.signMessageTron(message),
            eth: () => Web3WalletConnector.signMessageEthereum(message),
            bsc: () => Web3WalletConnector.signMessageEthereum(message),
            avalanche: () => Web3WalletConnector.signMessageEthereum(message),
        }
        return strategies[chainName]?.()
    }
    private static formatAccountInfo(accountInfo: any, chainName: string) {
        return {
            account: accountInfo.account,
            address: accountInfo.address,
            chain: chainName,
            createdAt: accountInfo.created_at,
        }
    }

    static async getAccount(address: string): Promise<any | null> {
        const sha256 = CryptoJS.SHA256(address).toString()
        const params = {
            code: 'o.fl22',
            scope: 'o.fl22',
            table: 'proxyaccts',
            index_position: 2,
            key_type: 'sha256',
            lower_bound: sha256,
            upper_bound: sha256,
            json: true,
        }
        const {rows} = await this.apiClient.post('/v1/chain/get_table_rows', params)
        return rows[0] || null
    }

    static async bindAccount(params: any): Promise<string> {
        const {body} = params
        const response = await this.proxyClient.post(`/api/submit/bind${body.base_chain}`, params)
        return response.code === 200 ? 'success' : 'error'
    }

    private static async pushTransaction(
        chainName: ChainType,
        address: string,
        txnpacked: any,
        plainTxnpacked: any,
        signature: string
    ): Promise<any> {
        const isSolana = chainName === 'solana'
        const params = {
            body: isSolana
                ? {
                      txns: txnpacked.txns,
                      nonce: txnpacked.nonce,
                      address,
                      signature,
                  }
                : {
                      txns: txnpacked.txns,
                      nonce: txnpacked.nonce,
                      hash_type: 'keccak',
                      address,
                      sign_message: encode(JSON.stringify(plainTxnpacked)),
                      signature,
                  },
            ts: Math.round(new Date().getTime() / 1000),
        }
        return this.proxyClient.post(`/api/submit/push${isSolana ? 'sol' : chainName}`, params)
    }

    private static async serializeTransactionData(spotInfo: any): Promise<string> {
        const jsonRpc = new JsonRpc(API_CONFIG.CHAIN_API, {fetch})
        const {binargs} = await jsonRpc.abi_json_to_bin(
            spotInfo.contract,
            spotInfo.action,
            spotInfo.data
        )
        return binargs
    }

    static sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time))
}

export default chainTransaction
