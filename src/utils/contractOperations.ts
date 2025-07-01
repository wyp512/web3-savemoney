import { ethers } from 'ethers';
import { contractAddress, contractAbi } from './contract';

// 获取合约实例的通用函数
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
export const depositToContract = async (amount: string = '0.01') => {
  try {
    const contract = await getContract();
    
    // 将金额转换为 wei
    const depositAmount = ethers.parseEther(amount);
    
    const tx = await contract.deposit({ value: depositAmount });
    
    console.log('存款交易已发送:', tx.hash);
    
    // 等待交易确认
    await tx.wait();
    
    console.log('存款成功!');
    
    return {
      success: true,
      txHash: tx.hash,
      message: '存款成功!'
    };
    
  } catch (error: any) {
    console.error('存款失败:', error);
    throw new Error(error.message || '存款失败');
  }
};

// 取款功能
export const withdrawFromContract = async (amount: string = '0.005') => {
  try {
    const contract = await getContract();
    
    // 将金额转换为 wei
    const withdrawAmount = ethers.parseEther(amount);
    
    const tx = await contract.withdraw(withdrawAmount);
    
    console.log('取款交易已发送:', tx.hash);
    
    // 等待交易确认
    await tx.wait();
    
    console.log('取款成功!');
    
    return {
      success: true,
      txHash: tx.hash,
      message: '取款成功!'
    };
    
  } catch (error: any) {
    console.error('取款失败:', error);
    throw new Error(error.message || '取款失败');
  }
};

// 查询余额功能
export const getContractBalance = async () => {
  try {
    const contract = await getContract();
    
    // 调用 getBalance 函数
    const balanceWei = await contract.getBalance();
    
    // 将 wei 转换为 SSS (等同于 ETH)
    const balanceSSS = ethers.formatEther(balanceWei);
    
    console.log('余额查询成功:', balanceSSS, 'SSS');
    
    return {
      success: true,
      balance: balanceSSS,
      balanceWei: balanceWei.toString()
    };
    
  } catch (error: any) {
    console.error('查询余额失败:', error);
    throw new Error(error.message || '查询余额失败');
  }
};

// 转账功能
export const transferFromContract = async (toAddress: string, amount: string) => {
  try {
    // 验证输入
    if (!toAddress) {
      throw new Error('请输入目标地址');
    }
    if (!amount || parseFloat(amount) <= 0) {
      throw new Error('请输入有效的转账金额');
    }
    
    // 验证地址格式
    if (!ethers.isAddress(toAddress)) {
      throw new Error('目标地址格式不正确');
    }
    
    const contract = await getContract();
    
    // 检查合约余额是否足够
    const currentBalanceWei = await contract.getBalance();
    const currentBalance = parseFloat(ethers.formatEther(currentBalanceWei));
    const transferAmountNum = parseFloat(amount);
    
    if (currentBalance < transferAmountNum) {
      throw new Error(`余额不足！当前余额: ${currentBalance.toFixed(6)} SSS，需要转账: ${transferAmountNum} SSS。请先存款。`);
    }
    
    // 使用 ethers.parseEther 转换金额
    const amountWei = ethers.parseEther(amount);
    
    console.log('开始转账:', {
      to: toAddress,
      amount: amount + ' SSS',
      amountWei: amountWei.toString()
    });
    
    const tx = await contract.transfer(toAddress, amountWei);
    
    console.log('转账交易已发送:', tx.hash);
    
    // 等待交易确认
    await tx.wait();
    
    console.log('转账成功!');
    
    // 获取发送方地址
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const fromAddress = await signer.getAddress();
    
    return {
      success: true,
      txHash: tx.hash,
      message: '转账成功!',
      from: fromAddress,
      to: toAddress,
      amount: amount
    };
    
  } catch (error: any) {
    console.error('转账失败详情:', error);
    
    // 更详细的错误处理
    let errorMessage = '转账失败';
    
    if (error.message) {
      if (error.message.includes('余额不足')) {
        errorMessage = error.message;
      } else if (error.message.includes('missing revert data')) {
        errorMessage = '合约执行失败，可能是余额不足或合约条件不满足。请确保：1）已在合约中存款 2）余额充足 3）网络连接正常';
      } else if (error.message.includes('user rejected')) {
        errorMessage = '用户取消了交易';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'ETH余额不足支付gas费用';
      } else {
        errorMessage = error.message;
      }
    }
    
    throw new Error(errorMessage);
  }
};

// 批量操作 - 查询余额后执行操作
export const getBalanceAndExecute = async (operation: () => Promise<any>) => {
  try {
    const balanceResult = await getContractBalance();
    const operationResult = await operation();
    
    return {
      balance: balanceResult,
      operation: operationResult
    };
  } catch (error) {
    throw error;
  }
};

// 导出所有操作的类型定义
export interface ContractOperationResult {
  success: boolean;
  txHash?: string;
  message: string;
  balance?: string;
  balanceWei?: string;
  from?: string;
  to?: string;
  amount?: string;
} 