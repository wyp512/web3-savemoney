import { ethers } from 'ethers';

// 扩展 Window 接口以包含 ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

// 连接MetaMask
export const connectWallet = async () => {
  try {
    if (!window.ethereum) {
      throw new Error("请安装MetaMask!");
    }
    
    // 请求用户连接MetaMask
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // 获取provider (ethers v6 语法)
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // 获取signer
    const signer = await provider.getSigner();
    
    // 获取当前网络
    const network = await provider.getNetwork();
    
    return {
      address: accounts[0],
      signer,
      chainId: Number(network.chainId)
    };
  } catch (error) {
    console.error("连接钱包失败:", error);
    throw error;
  }
};

// 监听MetaMask账户变化
export const listenToAccountChanges = (callback: (address: string) => void) => {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      callback(accounts[0] || '');
    });
  }
};

// 监听网络变化
export const listenToNetworkChanges = (callback: (chainId: number) => void) => {
  if (window.ethereum) {
    window.ethereum.on('chainChanged', (chainId: string) => {
      callback(parseInt(chainId, 16)); // chainId 是十六进制字符串，需要转换为十进制
    });
  }
};

// 检查MetaMask是否已连接
export const checkWalletConnection = async () => {
  try {
    if (!window.ethereum) {
      return null;
    }
    
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      return {
        address: accounts[0],
        chainId: Number(network.chainId)
      };
    }
    
    return null;
  } catch (error) {
    console.error("检查钱包连接失败:", error);
    return null;
  }
};

// 断开钱包连接
export const disconnectWallet = async () => {
  try {
    // MetaMask 没有直接的断开连接方法
    // 但我们可以尝试请求用户断开连接（如果支持的话）
    if (window.ethereum && window.ethereum.request) {
      // 有些钱包支持 wallet_requestPermissions 来重新请求权限
      // 这可以让用户重新选择是否连接
      console.log("请在 MetaMask 中手动断开连接");
    }
    
    return true;
  } catch (error) {
    console.error("断开钱包连接失败:", error);
    return false;
  }
}; 