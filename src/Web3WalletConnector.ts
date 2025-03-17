import {ethers} from 'ethers'
import {Serialize} from 'eosjs'

class Web3WalletConnector {
    static async connectEthereum(): Promise<any>{
        if (!window.ethereum) throw new Error('MetaMask is not installed')
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const {chainId} = await provider.getNetwork()
        if (chainId !== 1) {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [
                    {
                        chainId: '0x1',
                    },
                ],
            })
        }
        const accounts = await provider.send('eth_requestAccounts', [])
        return accounts[0] || null
    }
    static async connectBSC(): Promise<any>{
        if (!window.ethereum) throw new Error('MetaMask is not installed')
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const {chainId} = await provider.getNetwork()
        if (chainId !== 56) {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [
                    {
                        chainId: '0x38',
                    },
                ],
            })
        }
        const accounts = await provider.send('eth_requestAccounts', [])
        return accounts[0] || null
    }
    static async connectAvalanche(): Promise<any>{
        if (!window.ethereum) throw new Error('MetaMask is not installed')
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const {chainId} = await provider.getNetwork()
        if (chainId !== 43114) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [
                        {
                            chainId: '0xa86a',
                        },
                    ],
                })
            } catch (e: any) {
                if (e.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: '0xA86A',
                                chainName: 'Avalanche Mainnet C-Chain',
                                nativeCurrency: {
                                    name: 'Avalanche',
                                    symbol: 'AVAX',
                                    decimals: 18,
                                },
                                rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
                                blockExplorerUrls: ['https://snowtrace.io/'],
                            },
                        ],
                    })
                }
            }
        }
        const accounts = await provider.send('eth_requestAccounts', [])
        return accounts[0] || null
    }

    static async connectSolana(): Promise<any>{
        try {
            const resp = await window.solana.connect()
            return resp.publicKey.toString()
        } catch (e) {
            console.log(e)
        }
        return null
    }

    static async connectTron(): Promise<any> {
        if (window.tronWeb) {
            const walletAddress = window.tronWeb.defaultAddress.base58
            return walletAddress
        }
    }

    static async signMessageEthereum(message: string): Promise<string> {
        if (!window.ethereum) throw new Error('MetaMask is not installed')
        const provider = new ethers.providers.Web3Provider(window.ethereum, 1)
        const signer = provider.getSigner()
        return signer.signMessage(message)
    }

    static async signMessageAvalanche(message: string): Promise<string> {
        if (!window.ethereum) throw new Error('MetaMask is not installed')
        const provider = new ethers.providers.Web3Provider(window.ethereum, 43114)
        const signer = provider.getSigner()
        return signer.signMessage(message)
    }

    static async signMessageSolana(message: string): Promise<string> {
        if (!window.solana || !window.solana.isPhantom) throw new Error('Phantom Wallet not found')
        const encodedMessage = new TextEncoder().encode(message)
        const {signature} = await window.solana.signMessage(encodedMessage, 'utf8')
        const signMessageData = Serialize.arrayToHex(signature)
        return signMessageData
    }

    static async signMessageTron(message: string): Promise<string> {
        if (!window.tronWeb || !window.tronWeb) throw new Error('TronLink Wallet not found')
        const signedMessage = await window.tronWeb.trx.signMessageV2(message)
        return signedMessage
    }
}

export default Web3WalletConnector
