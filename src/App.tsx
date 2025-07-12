import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { connectWallet, listenToAccountChanges, listenToNetworkChanges, disconnectWallet } from './utils/web3'
import { 
  depositToContract, 
  withdrawFromContract, 
  getContractBalance, 
  transferFromContract 
} from './utils/contractOperations'

interface WalletState {
  address: string;
  chainId: number;
  isConnected: boolean;
}

interface TransactionResult {
  txHash?: string;
  balance?: string;
}

// 常量定义
const CONSTANTS = {
  DEPOSIT_AMOUNT: '0.01',
  WITHDRAW_AMOUNT: '0.005',
  NETWORKS: {
    1: 'Ethereum 主网',
    11155111: 'Sepolia 测试网',
    5: 'Goerli 测试网',
    137: 'Polygon 主网',
    80001: 'Polygon Mumbai 测试网'
  } as const
} as const;

// 工具函数
const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getNetworkName = (chainId: number): string => {
  return CONSTANTS.NETWORKS[chainId as keyof typeof CONSTANTS.NETWORKS] || `未知网络 (${chainId})`;
};

const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const isValidAmount = (amount: string): boolean => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

function App() {
  const [wallet, setWallet] = useState<WalletState>({
    address: '',
    chainId: 0,
    isConnected: false
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  
  // 转账相关状态
  const [transferTo, setTransferTo] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');

  // 通用的异步操作处理器
  const handleAsyncOperation = useCallback(async (
    operation: () => Promise<TransactionResult>,
    successCallback?: () => void
  ) => {
    try {
      setIsLoading(true);
      setError('');
      setTxHash('');
      
      const result = await operation();
      
      if (result.txHash) {
        setTxHash(result.txHash);
      }
      
      if (result.balance) {
        setBalance(result.balance);
      }
      
      successCallback?.();
      
    } catch (err: any) {
      setError(err.message || '操作失败');
      console.error('操作失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 重置应用状态
  const resetAppState = useCallback(() => {
    setWallet({
      address: '',
      chainId: 0,
      isConnected: false
    });
    setBalance('0');
    setTxHash('');
    setError('');
    setTransferTo('');
    setTransferAmount('');
  }, []);

  // 监听账户和网络变化
  useEffect(() => {
    const handleAccountChange = (address: string) => {
      if (wallet.isConnected) {
        if (address) {
          setWallet(prev => ({ ...prev, address }));
        } else {
          resetAppState();
        }
      }
    };

    const handleNetworkChange = (chainId: number) => {
      if (wallet.isConnected) {
        setWallet(prev => ({ ...prev, chainId }));
      }
    };

    listenToAccountChanges(handleAccountChange);
    listenToNetworkChanges(handleNetworkChange);
  }, [wallet.isConnected, resetAppState]);

  // 连接钱包
  const handleConnectWallet = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError('');
      
      const connection = await connectWallet();
      setWallet({
        address: connection.address,
        chainId: connection.chainId,
        isConnected: true
      });
      
      console.log('钱包连接成功:', connection);
    } catch (err: any) {
      setError(err.message || '连接钱包失败');
      console.error('连接钱包失败:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // 断开钱包连接
  const handleDisconnectWallet = useCallback(async () => {
    try {
      await disconnectWallet();
      resetAppState();
      console.log('钱包已断开连接');
    } catch (err: any) {
      console.error('断开钱包连接失败:', err);
    }
  }, [resetAppState]);

  // 存款功能
  const handleDeposit = useCallback(async () => {
    await handleAsyncOperation(
      () => depositToContract(CONSTANTS.DEPOSIT_AMOUNT),
      () => handleGetBalance()
    );
  }, [handleAsyncOperation]);

  // 取款功能
  const handleWithdraw = useCallback(async () => {
    await handleAsyncOperation(
      () => withdrawFromContract(CONSTANTS.WITHDRAW_AMOUNT),
      () => handleGetBalance()
    );
  }, [handleAsyncOperation]);

  // 查询余额功能
  const handleGetBalance = useCallback(async () => {
    await handleAsyncOperation(() => getContractBalance());
  }, [handleAsyncOperation]);

  // 转账功能
  const handleTransfer = useCallback(async () => {
    // 输入验证
    if (!isValidAddress(transferTo)) {
      setError('请输入有效的目标地址');
      return;
    }
    
    if (!isValidAmount(transferAmount)) {
      setError('请输入有效的转账金额');
      return;
    }

    await handleAsyncOperation(
      () => transferFromContract(transferTo, transferAmount),
      () => {
        setTransferTo('');
        setTransferAmount('');
        handleGetBalance();
      }
    );
  }, [transferTo, transferAmount, handleAsyncOperation, handleGetBalance]);

  // 检查转账按钮是否可用
  const isTransferDisabled = isLoading || !transferTo || !transferAmount || 
    !isValidAddress(transferTo) || !isValidAmount(transferAmount);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Web3 存取款 DApp</h1>
        <p>连接你的 MetaMask 钱包开始</p>
      </header>

      <main className="app-main">
        <div className="wallet-section">
          {!wallet.isConnected ? (
            <div className="connect-wallet">
              <button 
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="connect-btn"
              >
                {isConnecting ? '连接中...' : '连接 MetaMask'}
              </button>
              
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="wallet-info">
              <h3>钱包已连接</h3>
              <div className="wallet-details">
                <p><strong>地址:</strong> {formatAddress(wallet.address)}</p>
                <p><strong>完整地址:</strong> <code>{wallet.address}</code></p>
                <p><strong>网络:</strong> {getNetworkName(wallet.chainId)}</p>
                <p><strong>链 ID:</strong> {wallet.chainId}</p>
              </div>
              
              <div className="wallet-actions">
                <p className="status">✅ 钱包连接成功！</p>
                <button 
                  onClick={handleDisconnectWallet}
                  className="disconnect-btn"
                >
                  断开连接
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 合约操作区域 */}
        {wallet.isConnected && (
          <div className="contract-section">
            <h3>合约操作</h3>
            
            {/* 余额显示 */}
            <div className="balance-display">
              <h4>当前余额: {balance} SSS</h4>
            </div>
            
            {/* 转账功能 */}
            <div className="transfer-section">
              <h4>转账功能</h4>
              <div className="transfer-inputs">
                <div className="input-group">
                  <label htmlFor="transferFrom">从地址 (From):</label>
                  <input
                    id="transferFrom"
                    type="text"
                    value={wallet.address}
                    disabled
                    className="address-input readonly-input"
                    title="当前连接的钱包地址"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="transferTo">目标地址 (To):</label>
                  <input
                    id="transferTo"
                    type="text"
                    placeholder="输入接收方地址 (0x...)"
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    disabled={isLoading}
                    className={`address-input ${!isValidAddress(transferTo) && transferTo ? 'invalid' : ''}`}
                  />
                  {transferTo && !isValidAddress(transferTo) && (
                    <span className="validation-error">请输入有效的地址格式</span>
                  )}
                </div>
                <div className="input-group">
                  <label htmlFor="transferAmount">转账金额 (SSS):</label>
                  <input
                    id="transferAmount"
                    type="number"
                    placeholder="输入转账金额"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    disabled={isLoading}
                    step="0.001"
                    min="0"
                    className={`amount-input ${!isValidAmount(transferAmount) && transferAmount ? 'invalid' : ''}`}
                  />
                  {transferAmount && !isValidAmount(transferAmount) && (
                    <span className="validation-error">请输入有效的金额</span>
                  )}
                </div>
                <button 
                  onClick={handleTransfer}
                  disabled={isTransferDisabled}
                  className="action-btn transfer-btn"
                >
                  {isLoading ? '转账中...' : 'Transfer'}
                </button>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="contract-actions">
              <button 
                onClick={handleDeposit}
                disabled={isLoading}
                className="action-btn deposit-btn"
              >
                {isLoading ? '处理中...' : `存款 (${CONSTANTS.DEPOSIT_AMOUNT} SSS)`}
              </button>
              
              <button 
                onClick={handleWithdraw}
                disabled={isLoading}
                className="action-btn withdraw-btn"
              >
                {isLoading ? '处理中...' : `取款 (${CONSTANTS.WITHDRAW_AMOUNT} SSS)`}
              </button>
              
              <button 
                onClick={handleGetBalance}
                disabled={isLoading}
                className="action-btn balance-btn"
              >
                {isLoading ? '查询中...' : '查询余额'}
              </button>
            </div>
            
            {/* 交易哈希显示 */}
            {txHash && (
              <div className="tx-info">
                <p><strong>交易哈希:</strong></p>
                <code>{txHash}</code>
              </div>
            )}
            
            {/* 错误信息显示 */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
