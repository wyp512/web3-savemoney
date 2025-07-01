import { useState, useEffect } from 'react'
import './App.css'
import { ethers } from 'ethers'
import { connectWallet, listenToAccountChanges, listenToNetworkChanges, checkWalletConnection, disconnectWallet } from './utils/web3'
import { contractAddress, contractAbi } from './utils/contract'

interface WalletState {
  address: string;
  chainId: number;
  isConnected: boolean;
}

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

  // 监听账户和网络变化
  useEffect(() => {
    listenToAccountChanges((address: string) => {
      // 只有在已连接状态下才响应账户变化
      if (wallet.isConnected) {
        if (address) {
          setWallet(prev => ({ ...prev, address }));
        } else {
          // 用户在MetaMask中断开连接时，重置状态
          setWallet({ address: '', chainId: 0, isConnected: false });
          setBalance('0');
          setTxHash('');
        }
      }
    });

    listenToNetworkChanges((chainId: number) => {
      // 只有在已连接状态下才响应网络变化
      if (wallet.isConnected) {
        setWallet(prev => ({ ...prev, chainId }));
      }
    });
  }, [wallet.isConnected]);

  // 连接钱包
  const handleConnectWallet = async () => {
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
  };

  // 断开钱包连接
  const handleDisconnectWallet = async () => {
    try {
      await disconnectWallet();
      
      // 清除应用状态
      setWallet({
        address: '',
        chainId: 0,
        isConnected: false
      });
      setBalance('0');
      setTxHash('');
      
      console.log('钱包已断开连接');
    } catch (err: any) {
      console.error('断开钱包连接失败:', err);
    }
  };

  // 获取合约实例
  const getContract = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("请安装MetaMask!");
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractAbi, signer);
      
      return contract;
    } catch (error) {
      console.error('获取合约实例失败:', error);
      throw error;
    }
  };

  // 存款功能
  const handleDeposit = async () => {
    try {
      setIsLoading(true);
      setError('');
      setTxHash('');
      
      const contract = await getContract();
      
      // 发送 0.01 SSS (等同于 0.01 ETH)
      const depositAmount = ethers.parseEther('0.01');
      
      const tx = await contract.deposit({ value: depositAmount });
      setTxHash(tx.hash);
      
      console.log('存款交易已发送:', tx.hash);
      
      // 等待交易确认
      await tx.wait();
      
      console.log('存款成功!');
      
      // 自动刷新余额
      await handleGetBalance();
      
    } catch (err: any) {
      setError(err.message || '存款失败');
      console.error('存款失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 取款功能
  const handleWithdraw = async () => {
    try {
      setIsLoading(true);
      setError('');
      setTxHash('');
      
      const contract = await getContract();
      
      // 取出 0.005 SSS (等同于 0.005 ETH)
      const withdrawAmount = ethers.parseEther('0.005');
      
      const tx = await contract.withdraw(withdrawAmount);
      setTxHash(tx.hash);
      
      console.log('取款交易已发送:', tx.hash);
      
      // 等待交易确认
      await tx.wait();
      
      console.log('取款成功!');
      
      // 自动刷新余额
      await handleGetBalance();
      
    } catch (err: any) {
      setError(err.message || '取款失败');
      console.error('取款失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 查询余额功能
  const handleGetBalance = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const contract = await getContract();
      
      // 调用 getBalance 函数
      const balanceWei = await contract.getBalance();
      
      // 将 wei 转换为 SSS (等同于 ETH)
      const balanceSSS = ethers.formatEther(balanceWei);
      
      setBalance(balanceSSS);
      
      console.log('余额查询成功:', balanceSSS, 'SSS');
      
    } catch (err: any) {
      setError(err.message || '查询余额失败');
      console.error('查询余额失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 转账功能
  const handleTransfer = async () => {
    try {
      setIsLoading(true);
      setError('');
      setTxHash('');
      
      // 验证输入
      if (!transferTo) {
        throw new Error('请输入目标地址');
      }
      if (!transferAmount || parseFloat(transferAmount) <= 0) {
        throw new Error('请输入有效的转账金额');
      }
      
      // 验证地址格式
      if (!ethers.isAddress(transferTo)) {
        throw new Error('目标地址格式不正确');
      }
      
      const contract = await getContract();
      
      // 检查合约余额是否足够
      const currentBalanceWei = await contract.getBalance();
      const currentBalance = parseFloat(ethers.formatEther(currentBalanceWei));
      const transferAmountNum = parseFloat(transferAmount);
      
      if (currentBalance < transferAmountNum) {
        throw new Error(`余额不足！当前余额: ${currentBalance.toFixed(6)} SSS，需要转账: ${transferAmountNum} SSS。请先存款。`);
      }
      
      // 使用 ethers.parseEther 转换金额
      const amountWei = ethers.parseEther(transferAmount);
      
      console.log('开始转账:', {
        from: wallet.address,
        to: transferTo,
        amount: transferAmount + ' SSS',
        amountWei: amountWei.toString()
      });
      
      const tx = await contract.transfer(transferTo, amountWei);
      setTxHash(tx.hash);
      
      console.log('转账交易已发送:', tx.hash);
      
      // 等待交易确认
      await tx.wait();
      
      console.log('转账成功!');
      
      // 清空输入框
      setTransferTo('');
      setTransferAmount('');
      
      // 自动刷新余额
      await handleGetBalance();
      
    } catch (err: any) {
      // 更详细的错误处理
      let errorMessage = '转账失败';
      
      if (err.message) {
        if (err.message.includes('余额不足')) {
          errorMessage = err.message;
        } else if (err.message.includes('missing revert data')) {
          errorMessage = '合约执行失败，可能是余额不足或合约条件不满足。请确保：1）已在合约中存款 2）余额充足 3）网络连接正常';
        } else if (err.message.includes('user rejected')) {
          errorMessage = '用户取消了交易';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'ETH余额不足支付gas费用';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      console.error('转账失败详情:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 格式化地址显示
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 获取网络名称
  const getNetworkName = (chainId: number) => {
    const networks: { [key: number]: string } = {
      1: 'Ethereum 主网',
      11155111: 'Sepolia 测试网',
      5: 'Goerli 测试网',
      137: 'Polygon 主网',
      80001: 'Polygon Mumbai 测试网'
    };
    return networks[chainId] || `未知网络 (${chainId})`;
  };

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
                    className="address-input"
                  />
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
                    className="amount-input"
                  />
                </div>
                <button 
                  onClick={handleTransfer}
                  disabled={isLoading || !transferTo || !transferAmount}
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
                {isLoading ? '处理中...' : '存款 (0.01 SSS)'}
              </button>
              
              <button 
                onClick={handleWithdraw}
                disabled={isLoading}
                className="action-btn withdraw-btn"
              >
                {isLoading ? '处理中...' : '取款 (0.005 SSS)'}
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
